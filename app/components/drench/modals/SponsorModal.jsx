'use client'
import { useState } from 'react'
import VoiceMemo from '../VoiceMemo'
import { ModalShell } from './IdeaModal'

export default function SponsorModal({ user, onClose }) {
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!companyName.trim()) return
    setLoading(true)
    try {
      await fetch('/api/notion/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim(), contactName: contactName.trim(), notes: notes.trim(), flaggedBy: user }),
      })
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="💰 Flag Sponsor" onClose={onClose} success={success}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Company / Brand *</label>
          <input
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            required
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Company name"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Contact Name</label>
          <input
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Who reached out?"
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
            placeholder="Budget, timeline, details..."
          />
        </div>
        <div className="text-xs text-gray-500">Flagged by: <strong>{user || 'Unknown'}</strong></div>
        <button
          type="submit"
          disabled={loading || !companyName.trim()}
          className="w-full bg-dl-red text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? 'Flagging...' : 'Flag Sponsor'}
        </button>
      </form>
    </ModalShell>
  )
}
