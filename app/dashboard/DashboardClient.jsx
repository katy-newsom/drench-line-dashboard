'use client'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const GOAL = 2 // episodes per month goal

export default function DashboardClient({ stats, leaderboard, health }) {
  const liveCount = health?.liveThisMonth ?? 0
  const progressPct = Math.min((liveCount / GOAL) * 100, 100)
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (progressPct / 100) * circumference

  return (
    <main className="pb-20 min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 pt-12">

        {/* Header */}
        <h1 className="text-2xl font-bold mb-4">Drench Line 🎙️</h1>

        {/* Transistor Stats Bar */}
        <section className="bg-black text-white rounded-2xl p-5 mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Episodes</p>
          {stats ? (
            <>
              <div>
                <div className="text-5xl font-bold text-white">{stats.episodeCount}</div>
                <div className="text-xs text-gray-400 mt-1">Published episodes</div>
              </div>
              {stats.latestEpisode && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-0.5">🎙️ Latest episode</p>
                  <p className="font-bold text-sm leading-tight">{stats.latestEpisode}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Transistor not connected</p>
          )}
        </section>

        {/* Weekly Leaderboard */}
        <section className="mb-5">
          <h2 className="text-xl font-bold mb-3">This Week&apos;s MVP 🏆</h2>
          {leaderboard.length === 0 ? (
            <div className="bg-gray-100 rounded-2xl p-6 text-center text-gray-500 text-sm font-medium">
              No ideas submitted yet this week. Be the first! 💡
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.name}
                  className={`flex items-center justify-between rounded-2xl px-5 py-4 ${
                    i === 0
                      ? 'bg-dl-red text-white'
                      : 'bg-gray-100 text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black">
                      {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <span className={`font-bold text-lg ${i === 0 ? 'text-white' : 'text-black'}`}>
                      {entry.name}
                    </span>
                  </div>
                  <div className={`text-right`}>
                    <span className={`text-2xl font-black ${i === 0 ? 'text-white' : 'text-dl-red'}`}>
                      {entry.count}
                    </span>
                    <div className={`text-xs ${i === 0 ? 'text-white/70' : 'text-gray-500'}`}>ideas</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Episode Health */}
        <section>
          <h2 className="text-xl font-bold mb-3">Episode Health</h2>
          <div className="grid grid-cols-2 gap-3">

            {/* Monthly progress ring */}
            <div className="bg-black text-white rounded-2xl p-4 flex flex-col items-center">
              <svg width="96" height="96" className="-rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#333" strokeWidth="8" />
                <circle
                  cx="48" cy="48" r="40" fill="none"
                  stroke="#CC0000" strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="text-center -mt-2">
                <div className="text-2xl font-black">{liveCount}/{GOAL}</div>
                <div className="text-xs text-gray-400">This month</div>
              </div>
            </div>

            {/* Streak + next episode */}
            <div className="flex flex-col gap-3">
              <div className="bg-gray-100 rounded-2xl p-4 flex-1">
                <div className="text-3xl font-black text-dl-red">{health?.streak ?? 0}</div>
                <div className="text-xs font-bold text-gray-600 mt-0.5">Week streak 🔥</div>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4 flex-1">
                {health?.nextEpisode ? (
                  <>
                    <div className="text-xs font-bold text-gray-500 mb-1">Next up 📅</div>
                    <div className="font-bold text-sm leading-tight line-clamp-2">{health.nextEpisode.title}</div>
                    <div className="text-xs text-dl-red font-bold mt-1">{formatDate(health.nextEpisode.releaseDate)}</div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">No episodes scheduled</div>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
