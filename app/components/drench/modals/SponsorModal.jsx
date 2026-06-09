'use client'
import { useState } from 'react'
import { ModalShell } from './IdeaModal'

const TIERS = ['BASE', 'CORE', 'LEAD', 'In-Kind', 'Custom']
const STATUSES = ['Lead', 'Contacted', 'In Talks']

export default function SponsorModal({ user, onClose }) {
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [tier, setTier] = useState('')
  const [status, setStatus] = useState('Lead')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!companyName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          tier: tier || undefined,
          status,
          notes: notes.trim(),
          flaggedBy: user,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <ModalShell title="💰 Flag Sponsor" onClose={onClose} success={success}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Company / Brand *</label>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} required autoFocus
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Who should we reach out to?" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Contact Name</label>
          <input value={contactName} onChange={e => setContactName(e.target.value)}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Who do we talk to?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red bg-white">
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Tier Interest</label>
            <select value={tier} onChange={e => setTier(e.target.value)}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red bg-white">
              <option value="">— Unknown</option>
              {TIERS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="Budget, timeline, how they found us…" />
        </div>
        <div className="text-xs text-gray-500">Flagged by: <strong>{user || 'Unknown'}</strong></div>
        {error && <p className="text-sm text-dl-red font-medium">{error}</p>}
        <button type="submit" disabled={loading || !companyName.trim()}
          className="w-full bg-dl-red text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-95 transition-transform">
          {loading ? 'Saving…' : 'Flag Sponsor'}
        </button>
      </form>
    </ModalShell>
  )
}
