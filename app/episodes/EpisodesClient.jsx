'use client'
import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/app/context/UserContext'
import CommentThread from '@/app/components/drench/CommentThread'

const STATUSES = ['Idea', 'Planned', 'Recorded', 'Editing', 'Scheduled', 'Live']

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}


function EpisodeEditSheet({ episode, onClose, onSave }) {
  const { user } = useUser()
  const [title, setTitle] = useState(episode.title)
  const [status, setStatus] = useState(episode.status)
  const [episodeNumber, setEpisodeNumber] = useState(episode.episodeNumber ?? '')
  const [recordingDate, setRecordingDate] = useState(episode.recordingDate ?? '')
  const [releaseDate, setReleaseDate] = useState(episode.releaseDate ?? '')
  const [notes, setNotes] = useState(episode.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)

    await fetch('/api/notion/episodes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: episode.id,
        title,
        status,
        episodeNumber: episodeNumber !== '' ? Number(episodeNumber) : null,
        recordingDate: recordingDate || null,
        releaseDate: releaseDate || null,
        notes,
      }),
    })

    setSaving(false)
    onSave({ ...episode, title, status, episodeNumber: episodeNumber !== '' ? Number(episodeNumber) : null, recordingDate, releaseDate, notes })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg bg-card rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl uppercase leading-none">Edit episode</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red bg-white">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Episode #</label>
              <input type="number" value={episodeNumber} onChange={e => setEpisodeNumber(e.target.value)}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1">Recording Date</label>
              <input type="date" value={recordingDate} onChange={e => setRecordingDate(e.target.value)}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Release Date</label>
              <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red" />
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full mt-5 bg-dl-red text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-95 transition-transform">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Team comment thread */}
        <div className="mt-4">
          <CommentThread pageId={episode.id} author={user} />
        </div>
      </div>
    </div>
  )
}

function NewEpisodeModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    const res = await fetch('/api/notion/episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), status: 'Idea' }),
    })
    const data = await res.json()
    onCreated({ id: data.id, title: title.trim(), status: 'Idea', episodeNumber: null, recordingDate: null, releaseDate: null, notes: '' })
    setLoading(false)
    setSuccess(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-t-xl p-6 bg-card">
        {success ? (
          <div className="text-center py-8">
            <p className="font-display text-2xl uppercase">Episode created</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl uppercase leading-none">New episode</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
                placeholder="Episode title..." />
              <button type="submit" disabled={loading || !title.trim()}
                className="w-full bg-dl-red text-white font-bold py-3 rounded-lg disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Episode'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function EpisodeRow({ ep, onTap }) {
  const live = ep.status === 'Live'

  return (
    <button
      onClick={() => onTap(ep)}
      className="w-full text-left bg-card border border-line rounded-xl p-4 flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {ep.episodeNumber != null && (
            <span className="text-xs font-semibold text-muted">Ep. {ep.episodeNumber}</span>
          )}
          <span className={`text-xs font-semibold ${live ? 'text-accent' : 'text-ink-2'}`}>
            {ep.status}
          </span>
        </div>
        <p className="font-semibold text-base leading-snug mt-1">{ep.title}</p>
        <div className="flex gap-3 mt-1 flex-wrap">
          {ep.recordingDate && (
            <span className="text-xs text-muted">Record {formatDate(ep.recordingDate)}</span>
          )}
          {ep.releaseDate && (
            <span className="text-xs text-muted">Release {formatDate(ep.releaseDate)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0">
        <span className="text-xs font-bold">Edit</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

function StatusSection({ status, episodes, onTap }) {
  const [collapsed, setCollapsed] = useState(status === 'Archived' || (status === 'Idea' && episodes.length > 5))

  if (episodes.length === 0) return null

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <span className={`text-xs font-semibold ${status === 'Live' ? 'text-accent' : 'text-ink-2'}`}>
          {status}
        </span>
        <span className="text-xs text-gray-400 font-medium">{episodes.length} episode{episodes.length !== 1 ? 's' : ''}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {episodes.map(ep => <EpisodeRow key={ep.id} ep={ep} onTap={onTap} />)}
        </div>
      )}
    </div>
  )
}

export default function EpisodesClient() {
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEp, setSelectedEp] = useState(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notion/episodes')
      const data = await res.json()
      setEpisodes(data.episodes ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function onSave(updated) {
    setEpisodes(eps => eps.map(e => e.id === updated.id ? updated : e))
    setSelectedEp(null)
  }

  function onCreated(ep) {
    setEpisodes(eps => [ep, ...eps])
  }

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = episodes
      .filter(e => e.status === s)
      .sort((a, b) => {
        if (a.releaseDate && b.releaseDate) return new Date(a.releaseDate) - new Date(b.releaseDate)
        if (a.releaseDate) return -1
        if (b.releaseDate) return 1
        if (a.episodeNumber != null && b.episodeNumber != null) return a.episodeNumber - b.episodeNumber
        if (a.episodeNumber != null) return -1
        if (b.episodeNumber != null) return 1
        return 0
      })
    return acc
  }, {})

  const activeCount = episodes.filter(e => e.status !== 'Live').length

  return (
    <main className="pb-24 min-h-screen">
      <div className="pt-16 px-4 max-w-lg mx-auto">
        <div className="flex items-end justify-between mb-1 gap-3">
          <div>
            <p className="eyebrow mb-2">Show</p>
            <h1 className="font-display text-[2rem] uppercase leading-none">Episodes</h1>
          </div>
          <button onClick={() => setShowNew(true)}
            className="bg-ink text-white text-sm font-semibold px-4 py-2 rounded-lg">
            New
          </button>
        </div>
        {activeCount > 0 && (
          <p className="text-sm text-gray-400 mb-5">{activeCount} episode{activeCount !== 1 ? 's' : ''} in progress — tap any to edit</p>
        )}

        {loading ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="mt-4">
            {STATUSES.map(status => (
              <StatusSection
                key={status}
                status={status}
                episodes={byStatus[status]}
                onTap={setSelectedEp}
              />
            ))}
            {episodes.length === 0 && (
              <div className="border border-dashed border-line-strong rounded-xl p-10 text-center">
                <p className="font-semibold text-ink mb-1">No episodes yet</p>
                <p className="text-xs text-muted">Tap New to add the first one.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedEp && (
        <EpisodeEditSheet episode={selectedEp} onClose={() => setSelectedEp(null)} onSave={onSave} />
      )}
      {showNew && (
        <NewEpisodeModal onClose={() => setShowNew(false)} onCreated={onCreated} />
      )}
    </main>
  )
}
