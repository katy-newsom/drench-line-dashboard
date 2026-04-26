'use client'
import { useState } from 'react'
import VoiceMemo from '../VoiceMemo'
import { ModalShell } from './IdeaModal'

export default function GuestModal({ user, onClose }) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await fetch('/api/notion/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), contact: contact.trim(), notes: notes.trim(), status: 'Pitched' }),
      })
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="👤 Suggest Guest" onClose={onClose} success={success}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Guest Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Full name or handle"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Contact Info</label>
          <input
            value={contact}
            onChange={e => setContact(e.target.value)}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Email, Instagram, website..."
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-bold">Why them?</label>
            <VoiceMemo onTranscript={setNotes} />
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Why would they be great?"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-dl-red text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? 'Submitting...' : 'Suggest Guest'}
        </button>
      </form>
    </ModalShell>
  )
}
