'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useUser } from '@/app/context/UserContext'
import CommentThread from '@/app/components/drench/CommentThread'

const IdeaModal = dynamic(() => import('@/app/components/drench/modals/IdeaModal'))

const FILTERS = ['All', 'Idea', 'Planned', 'Used']
const STATUSES = ['Idea', 'Planned', 'Used']


function IdeaRow({ idea, onUpdate }) {
  const { user } = useUser()
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(idea.title)
  const [status, setStatus] = useState(idea.status ?? 'Idea')
  const [notes, setNotes] = useState(idea.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function save(updates) {
    setSaving(true)
    await fetch('/api/notion/ideas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idea.id, ...updates }),
    })
    setSaving(false)
    onUpdate({ ...idea, ...updates })
  }

  return (
    <div className="border-2 border-black rounded-xl overflow-hidden">
      <button
        className="w-full text-left px-4 py-4 flex items-center justify-between active:bg-gray-50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 pr-3">
          <div className="font-bold text-sm leading-snug">{idea.title}</div>
          {idea.submittedBy && (
            <div className="text-xs text-gray-500 mt-0.5">{idea.submittedBy}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold text-ink-2">
            {status ?? '—'}
          </span>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t-2 border-black px-4 py-4 space-y-3 bg-gray-50">
          <div>
            <label className="block text-xs font-bold mb-1">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => save({ title })}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Status</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); save({ status: e.target.value }) }}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red bg-white"
            >
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => save({ notes })}
              rows={3}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red bg-white"
              placeholder="Context, links, thoughts..."
            />
          </div>
          {saving && <p className="text-xs text-gray-400">Saving...</p>}

          {/* Team comment thread */}
          <CommentThread pageId={idea.id} author={user} />
        </div>
      )}
    </div>
  )
}

export default function IdeasClient() {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const { user } = useUser()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/ideas')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setIdeas(data.ideas ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Refresh when a new idea is submitted from the FAB
    window.addEventListener('ideas-updated', load)
    return () => window.removeEventListener('ideas-updated', load)
  }, [load])

  function onUpdate(updated) {
    setIdeas(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  const filtered = filter === 'All' ? ideas : ideas.filter(i => i.status === filter)

  return (
    <main className="pb-24 min-h-screen">
      {showAdd && <IdeaModal user={user} onClose={() => { setShowAdd(false); load() }} />}
      <div className="max-w-lg mx-auto px-4 pt-16">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <p className="eyebrow mb-2">Topics</p>
            <h1 className="font-display text-[2rem] uppercase leading-none">Ideas</h1>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-ink text-white text-sm font-semibold px-4 py-2 rounded-lg">Add</button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg border ${
                filter === f
                  ? 'bg-ink text-white border-ink'
                  : 'bg-card text-ink-2 border-line'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-dl-red rounded-xl p-4 text-sm text-dl-red font-medium mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-line-strong rounded-xl p-8 text-center">
            <div className="font-semibold text-ink mb-1">No ideas here yet</div>
            <div className="text-xs text-muted">Tap Add to drop one in.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(idea => (
              <IdeaRow key={idea.id} idea={idea} onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
