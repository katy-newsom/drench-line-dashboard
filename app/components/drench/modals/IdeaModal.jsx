'use client'
import { useState } from 'react'
import VoiceMemo from '../VoiceMemo'

// Must match the select options in the Notion "Topics & Ideas" DB exactly
const TEAM_MEMBERS = ['Jurahee Silvers', 'Sam Silvers', 'Conner Newsom', 'Jenny Bett Newsom', 'Katy Newsom', 'Logan Newsom']

export default function IdeaModal({ user, onClose }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  // Pre-select the logged-in user if their name matches a Notion option
  const [submittedBy, setSubmittedBy] = useState(
    TEAM_MEMBERS.find(m => m.toLowerCase().includes((user ?? '').toLowerCase().split(' ')[0])) ?? ''
  )
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), notes: notes.trim(), submittedBy: submittedBy || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')

      // Tell the Ideas page to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ideas-updated'))
      }
      setSuccess(true)
      setTimeout(onClose, 1400)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <ModalShell title="💡 Submit Idea" onClose={onClose} success={success}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Idea Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="What's the idea?"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-bold">Notes</label>
            <VoiceMemo onTranscript={setNotes} />
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Any details..."
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Submitting as</label>
          <select
            value={submittedBy}
            onChange={e => setSubmittedBy(e.target.value)}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red bg-white"
          >
            <option value="">— Select your name</option>
            {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {error && (
          <div className="text-sm text-dl-red font-medium bg-red-50 border border-dl-red rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full bg-dl-red text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? 'Submitting...' : 'Submit Idea'}
        </button>
      </form>
    </ModalShell>
  )
}

export function ModalShell({ title, onClose, success, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className={`w-full max-w-lg bg-white rounded-t-2xl p-6 animate-slide-up transition-colors ${success ? 'bg-dl-red' : ''}`}>
        {success ? (
          <div className="text-center py-8 text-white">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-xl font-bold">Submitted!</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">{title}</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">✕</button>
            </div>
            {children}
          </>
        )}
      </div>
    </div>
  )
}
