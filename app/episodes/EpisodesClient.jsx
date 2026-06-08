'use client'
import { useState, useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'

const STATUSES = ['Idea', 'Planned', 'Recorded', 'Editing', 'Scheduled', 'Live']

const STATUS_COLORS = {
  Idea: 'bg-gray-200 text-gray-700',
  Planned: 'bg-blue-100 text-blue-800',
  Recorded: 'bg-yellow-100 text-yellow-800',
  Editing: 'bg-orange-100 text-orange-800',
  Scheduled: 'bg-purple-100 text-purple-800',
  Live: 'bg-dl-red text-white',
}

const STATUS_EMOJI = {
  Idea: '💡',
  Planned: '📋',
  Recorded: '🎙️',
  Editing: '✂️',
  Scheduled: '📅',
  Live: '🔴',
}

function fireConfetti() {
  confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#CC0000', '#000000', '#ffffff', '#FF4444'] })
  setTimeout(() => {
    confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ['#CC0000', '#000000', '#ffffff'] })
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ['#CC0000', '#000000', '#ffffff'] })
  }, 300)
}

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}


function EpisodeEditSheet({ episode, onClose, onSave }) {
  const [title, setTitle] = useState(episode.title)
  const [status, setStatus] = useState(episode.status)
  const [episodeNumber, setEpisodeNumber] = useState(episode.episodeNumber ?? '')
  const [recordingDate, setRecordingDate] = useState(episode.recordingDate ?? '')
  const [releaseDate, setReleaseDate] = useState(episode.releaseDate ?? '')
  const [notes, setNotes] = useState(episode.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  async function save() {
    setSaving(true)
    const wasLive = episode.status === 'Live'
    const goingLive = status === 'Live' && !wasLive

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
    if (goingLive) {
      fireConfetti()
      setToast("🎉 It's live!")
      setTimeout(() => setToast(null), 3000)
    }
    onSave({ ...episode, title, status, episodeNumber: episodeNumber !== '' ? Number(episodeNumber) : null, recordingDate, releaseDate, notes })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        {toast && (
          <div className="fixed top-1/3 left-1/2 -translate-x-1/2 bg-black text-white font-bold px-6 py-3 rounded-full shadow-xl z-50 text-lg">
            {toast}
          </div>
        )}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Edit Episode</h2>
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
      <div className={`w-full max-w-lg rounded-t-2xl p-6 transition-colors ${success ? 'bg-dl-red' : 'bg-white'}`}>
        {success ? (
          <div className="text-center py-8 text-white">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-xl font-bold">Episode created!</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">New Episode</h2>
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
  const statusStyle = STATUS_COLORS[ep.status] ?? 'bg-gray-200 text-gray-700'

  return (
    <button
      onClick={() => onTap(ep)}
      className="w-full text-left bg-white border-2 border-gray-100 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform hover:border-black group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {ep.episodeNumber != null && (
            <span className="text-xs font-black text-gray-400">Ep. {ep.episodeNumber}</span>
          )}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusStyle}`}>
            {STATUS_EMOJI[ep.status]} {ep.status}
          </span>
        </div>
        <p className="font-bold text-base leading-snug mt-1">{ep.title}</p>
        <div className="flex gap-3 mt-1 flex-wrap">
          {ep.recordingDate && (
            <span className="text-xs text-gray-400">🎙️ Record {formatDate(ep.recordingDate)}</span>
          )}
          {ep.releaseDate && (
            <span className="text-xs text-gray-400">📅 Release {formatDate(ep.releaseDate)}</span>
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
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
          {STATUS_EMOJI[status]} {status}
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
    <main className="pb-20 min-h-screen bg-white">
      <div className="pt-12 px-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Episodes</h1>
          <button onClick={() => setShowNew(true)}
            className="bg-black text-white text-sm font-bold px-4 py-2 rounded-full active:scale-95 transition-transform">
            + New Episode
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
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                <div className="text-3xl mb-2">🎙️</div>
                <p className="font-bold text-gray-700 mb-1">No episodes yet</p>
                <p className="text-xs text-gray-400">Tap "+ New Episode" to add your first one</p>
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
