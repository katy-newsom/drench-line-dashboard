'use client'
import { useState, useEffect, useCallback } from 'react'

const FILTERS = ['All', 'Idea', 'Planned', 'Used']
const STATUSES = ['Idea', 'Planned', 'Used']

const STATUS_COLORS = {
  Idea: 'bg-yellow-100 text-yellow-800',
  Planned: 'bg-blue-100 text-blue-800',
  Used: 'bg-green-100 text-green-800',
}

function IdeaRow({ idea, onUpdate }) {
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
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
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
    <main className="pb-20 min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 pt-12">
        <h1 className="text-2xl font-bold mb-4">Ideas 💡</h1>

        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-sm font-bold px-4 py-2 rounded-full border-2 transition-colors ${
                filter === f
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
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
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <div className="text-2xl mb-2">💡</div>
            <div className="font-bold text-gray-700 mb-1">No ideas here yet</div>
            <div className="text-xs text-gray-400">Tap the + button to drop a quick idea</div>
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
