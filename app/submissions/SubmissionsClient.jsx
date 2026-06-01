'use client'
import { useState, useEffect, useCallback } from 'react'

const CATEGORIES = ['Health & Vet', 'Selection', 'Feeding', 'Showing', 'General', 'Other']
const SOURCES = ['Homepage Form', 'Submit a Question Page', 'Instagram DM', 'Other']
const STATUSES = ['New', 'Reviewed', 'Used on Air', 'Saved for Later', 'Archived']

const STATUS_COLORS = {
  'New':            'bg-blue-100 text-blue-700',
  'Reviewed':       'bg-yellow-100 text-yellow-800',
  'Used on Air':    'bg-green-100 text-green-700',
  'Saved for Later':'bg-purple-100 text-purple-700',
  'Archived':       'bg-gray-100 text-gray-500',
}

const CATEGORY_COLORS = {
  'Health & Vet': 'bg-red-50 text-red-700',
  'Selection':    'bg-orange-50 text-orange-700',
  'Feeding':      'bg-yellow-50 text-yellow-800',
  'Showing':      'bg-blue-50 text-blue-700',
  'General':      'bg-gray-100 text-gray-600',
  'Other':        'bg-stone-100 text-stone-600',
}

function formatDate(str) {
  if (!str) return ''
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Add Submission Drawer ─────────────────────────────────────────
function AddDrawer({ onClose, onSaved }) {
  const [form, setForm] = useState({
    question: '',
    submitterName: '',
    category: '',
    source: '',
    dateReceived: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.question.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to save')
      }
      onSaved()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <div className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-w-lg mx-auto w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Log a Submission</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
              Question / Message <span className="text-dl-red">*</span>
            </label>
            <textarea
              value={form.question}
              onChange={e => set('question', e.target.value)}
              required
              rows={3}
              placeholder="Type the listener's question exactly as submitted…"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red resize-none"
            />
          </div>

          {/* Submitter name */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Submitter Name</label>
            <input
              value={form.submitterName}
              onChange={e => set('submitterName', e.target.value)}
              placeholder="First name or anonymous"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red"
            />
          </div>

          {/* Category + Source row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red bg-white"
              >
                <option value="">— Pick one</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Source</label>
              <select
                value={form.source}
                onChange={e => set('source', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red bg-white"
              >
                <option value="">— Pick one</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Date received */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Date Received</label>
            <input
              type="date"
              value={form.dateReceived}
              onChange={e => set('dateReceived', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Internal Notes</label>
            <input
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Anything worth noting (optional)"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red"
            />
          </div>

          {error && <p className="text-sm text-dl-red font-medium">{error}</p>}

          <button
            type="submit"
            disabled={saving || !form.question.trim()}
            className="w-full bg-black text-white font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-40"
          >
            {saving ? 'Saving to Notion…' : 'Save Submission'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Submission card ───────────────────────────────────────────────
function SubmissionCard({ item, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function handleStatus(newStatus) {
    setUpdatingStatus(true)
    try {
      await fetch('/api/notion/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: newStatus }),
      })
      onStatusChange(item.id, newStatus)
    } catch {
      // non-fatal
    } finally {
      setUpdatingStatus(false)
    }
  }

  const statusStyle = STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-600'
  const categoryStyle = CATEGORY_COLORS[item.category] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left py-4 flex gap-3 items-start"
      >
        {/* ID pill */}
        <span className="text-xs font-black text-gray-300 pt-0.5 w-10 flex-shrink-0">
          Q{item.subId ?? '—'}
        </span>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2">{item.question}</p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {item.status && (
              <span className={`${statusStyle} text-xs px-2 py-0.5 rounded-full font-medium`}>{item.status}</span>
            )}
            {item.category && (
              <span className={`${categoryStyle} text-xs px-2 py-0.5 rounded-full font-medium`}>{item.category}</span>
            )}
          </div>
        </div>

        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="pb-4 pl-13 pl-[52px] pr-1 space-y-3">
          {item.submitterName && (
            <p className="text-sm text-gray-600"><span className="font-medium">From:</span> {item.submitterName}</p>
          )}
          {item.source && (
            <p className="text-sm text-gray-600"><span className="font-medium">Source:</span> {item.source}</p>
          )}
          {item.dateReceived && (
            <p className="text-sm text-gray-600"><span className="font-medium">Received:</span> {formatDate(item.dateReceived)}</p>
          )}
          {item.notes && (
            <p className="text-sm text-gray-600"><span className="font-medium">Notes:</span> {item.notes}</p>
          )}
          {item.episodeUsed?.length > 0 && (
            <p className="text-sm text-green-700 font-medium">✓ Used on air</p>
          )}

          {/* Status picker */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Mark as</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  disabled={updatingStatus || item.status === s}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-colors active:scale-95 disabled:opacity-40 ${
                    item.status === s
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-200 hover:border-black'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function SubmissionsClient() {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [activeFilter, setActiveFilter] = useState('New')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/submissions')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setItems(data.submissions ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleStatusChange(id, newStatus) {
    setItems(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
  }

  function handleSaved() {
    setShowAdd(false)
    load()
  }

  const filters = ['All', 'New', 'Reviewed', 'Saved for Later', 'Used on Air']
  const filtered = items?.filter(s => activeFilter === 'All' || s.status === activeFilter) ?? []

  const counts = {}
  for (const f of filters) {
    counts[f] = f === 'All' ? (items?.length ?? 0) : (items?.filter(s => s.status === f).length ?? 0)
  }

  return (
    <>
      {showAdd && <AddDrawer onClose={() => setShowAdd(false)} onSaved={handleSaved} />}

      <main className="pb-20 min-h-screen bg-white">
        <div className="max-w-lg mx-auto px-4 pt-12">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-bold">Submissions 📬</h1>
            <div className="flex gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-50"
              >
                {loading ? '…' : '↻'}
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-black text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-transform"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex-shrink-0 text-xs font-bold px-3 py-2 rounded-full border-2 transition-colors ${
                  activeFilter === f
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-200'
                }`}
              >
                {f} {counts[f] > 0 ? `(${counts[f]})` : ''}
              </button>
            ))}
          </div>

          {loading && (
            <div className="bg-white rounded-3xl shadow-sm px-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 py-4 border-b border-gray-100 animate-pulse">
                  <div className="w-10 h-4 bg-gray-100 rounded mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-5/6" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border-2 border-dl-red rounded-xl p-5 text-center">
              <p className="text-dl-red font-bold mb-1">Couldn't load submissions</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <div className="text-3xl mb-2">📬</div>
              <p className="font-bold text-gray-700 mb-1">
                {activeFilter === 'All' ? 'No submissions yet' : `No "${activeFilter}" submissions`}
              </p>
              <p className="text-xs text-gray-400">
                {activeFilter === 'All'
                  ? 'Tap "+ Add" to log your first listener question'
                  : 'Try a different filter above'}
              </p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm px-4">
              {filtered.map(item => (
                <SubmissionCard key={item.id} item={item} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
