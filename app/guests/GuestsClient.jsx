'use client'
import { useState, useEffect, useCallback } from 'react'

const STATUSES = ['Pitched', 'Confirmed', 'Recorded', 'Aired']

const STATUS_COLORS = {
  Pitched: 'bg-gray-100 text-gray-700',
  Confirmed: 'bg-yellow-100 text-yellow-800',
  Recorded: 'bg-blue-100 text-blue-800',
  Aired: 'bg-green-100 text-green-800',
}

function GuestRow({ guest, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(guest.status ?? 'Pitched')
  const [notes, setNotes] = useState(guest.notes ?? '')
  const [contact, setContact] = useState(guest.contact ?? '')
  const [saving, setSaving] = useState(false)

  async function save(updates) {
    setSaving(true)
    await fetch('/api/notion/guests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: guest.id, ...updates }),
    })
    setSaving(false)
    onUpdate({ ...guest, ...updates })
  }

  return (
    <div className="border-2 border-black rounded-xl overflow-hidden">
      <button
        className="w-full text-left px-4 py-4 flex items-center justify-between active:bg-gray-50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            {guest.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div className="font-bold text-sm">{guest.name}</div>
            {guest.contact && <div className="text-xs text-gray-500">{guest.contact}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t-2 border-black px-4 py-4 space-y-3 bg-gray-50">
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
            <label className="block text-xs font-bold mb-1">Contact</label>
            <input
              value={contact}
              onChange={e => setContact(e.target.value)}
              onBlur={() => save({ contact })}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red"
              placeholder="Email, Instagram, website..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => save({ notes })}
              rows={2}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red"
              placeholder="Why this guest? Topics, topics, topics..."
            />
          </div>
          {saving && <p className="text-xs text-gray-400">Saving...</p>}
        </div>
      )}
    </div>
  )
}

export default function GuestsClient() {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/guests')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGuests(data.guests ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function onUpdate(updated) {
    setGuests(gs => gs.map(g => g.id === updated.id ? updated : g))
  }

  return (
    <main className="pb-20 min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 pt-12">
        <h1 className="text-2xl font-bold mb-4">Guests 👥</h1>

        {loading && <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>}

        {error && (
          <div className="bg-red-50 border-2 border-dl-red rounded-xl p-4 text-sm text-dl-red font-medium">
            {error.includes('NOTION_GUESTS_DB_ID')
              ? 'Set NOTION_GUESTS_DB_ID in your environment variables to enable the Guests database.'
              : error}
          </div>
        )}

        {!loading && !error && guests.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <div className="text-2xl mb-2">🎤</div>
            <div className="font-bold text-gray-700 mb-1">No guests yet</div>
            <div className="text-xs text-gray-400">Tap + to suggest someone worth booking</div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {guests.map(guest => (
              <GuestRow key={guest.id} guest={guest} onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
