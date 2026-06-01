'use client'
import { useState } from 'react'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function StatPill({ label, value }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-3xl font-black text-white">
        {value != null ? value.toLocaleString() : '—'}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function NextEpisodeCard({ nextEpisode }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(nextEpisode.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/notion/episodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nextEpisode.id, notes: note }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // non-fatal
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-100 rounded-2xl overflow-hidden">
      {/* Tap target row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left p-5 flex items-start justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-dl-red uppercase tracking-widest mb-1">
            {formatDate(nextEpisode.releaseDate)}
          </p>
          <p className="font-bold text-lg leading-snug">{nextEpisode.title}</p>
          {!open && nextEpisode.notes && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{nextEpisode.notes}</p>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded prep notes */}
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-200 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Prep Notes</p>
          <textarea
            value={note}
            onChange={e => { setNote(e.target.value); setSaved(false) }}
            rows={4}
            placeholder="Jot down talking points, guest info, questions to hit, anything the hosts should know before recording…"
            className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red resize-none"
          />
          <button
            onClick={handleSave}
            disabled={saving || note === (nextEpisode.notes ?? '')}
            className={`w-full font-bold py-3 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-40 ${
              saved ? 'bg-green-500 text-white' : 'bg-black text-white'
            }`}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved to Notion' : 'Save Notes'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashboardClient({ transistor, nextEpisode }) {
  return (
    <main className="pb-20 min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 pt-12 space-y-5">

        <h1 className="text-2xl font-bold">Drench Line 🎙️</h1>

        {/* Transistor Stats */}
        <section className="bg-black text-white rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Listener Stats</p>
          {transistor ? (
            <div className="flex gap-6">
              <StatPill label="All-time downloads" value={transistor.allTime} />
              <div className="w-px bg-gray-700 self-stretch" />
              <StatPill label="This week" value={transistor.thisWeek} />
            </div>
          ) : (
            <div className="flex gap-6">
              <StatPill label="All-time downloads" value={null} />
              <div className="w-px bg-gray-700 self-stretch" />
              <StatPill label="This week" value={null} />
            </div>
          )}
          {transistor?.bestEpisode && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-0.5">🎙️ Latest episode</p>
              <p className="font-bold text-sm leading-tight">{transistor.bestEpisode}</p>
            </div>
          )}
        </section>

        {/* What's Next */}
        <section>
          <h2 className="text-xl font-bold mb-3">What&apos;s Next 📅</h2>
          {nextEpisode ? (
            <NextEpisodeCard nextEpisode={nextEpisode} />
          ) : (
            <div className="bg-gray-100 rounded-2xl p-5 text-center text-gray-500 text-sm font-medium">
              No episodes scheduled yet
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
