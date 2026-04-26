'use client'
import { useState } from 'react'
import VoiceMemo from '../VoiceMemo'
import { ModalShell } from './IdeaModal'

export default function VoiceNoteModal({ user, onClose }) {
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!transcript.trim()) return
    setLoading(true)
    try {
      await fetch('/api/notion/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: transcript.slice(0, 80).trim(), notes: transcript.trim(), submittedBy: user }),
      })
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="🎤 Voice Note" onClose={onClose} success={success}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-4">
          <VoiceMemo onTranscript={setTranscript} />
          <p className="text-sm text-gray-500">Tap the mic to start speaking</p>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Transcript</label>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            rows={4}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Your voice note will appear here — you can edit it before saving."
          />
        </div>
        <p className="text-xs text-gray-500">Saves as an idea submitted by <strong>{user || 'Unknown'}</strong></p>
        <button
          type="submit"
          disabled={loading || !transcript.trim()}
          className="w-full bg-dl-red text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? 'Saving...' : 'Save Note as Idea'}
        </button>
      </form>
    </ModalShell>
  )
}
