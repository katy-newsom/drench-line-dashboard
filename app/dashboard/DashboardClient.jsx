'use client'

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
            <div className="bg-gray-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-dl-red uppercase tracking-widest mb-1">
                {formatDate(nextEpisode.releaseDate)}
              </p>
              <p className="font-bold text-lg leading-snug">{nextEpisode.title}</p>
            </div>
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
