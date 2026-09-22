'use client'

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function EpisodeCallout({ emoji, label, episode, tone }) {
  if (!episode) return null
  return (
    <div className={`rounded-2xl p-4 border-2 ${tone === 'up' ? 'border-green-300 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">{emoji} {label}</p>
      <p className="font-bold text-sm leading-snug">Ep {episode.number} · {episode.title}</p>
      <p className="text-xs text-gray-500 mt-1">
        {episode.downloads.toLocaleString()} downloads in first {episode.daysLive} days · {formatDate(episode.publishedAt)}
      </p>
    </div>
  )
}

function TrendChart({ trend }) {
  if (!trend || trend.length === 0) return null
  const max = Math.max(...trend.map(w => w.total), 1)
  return (
    <div className="bg-black text-white rounded-2xl p-4 mb-5">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Downloads by Week 📊</p>
      <div className="flex items-end gap-1 h-24">
        {trend.map((w, i) => (
          <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
            <div
              className="w-full rounded-t bg-dl-red"
              style={{ height: `${Math.max(4, (w.total / max) * 100)}%` }}
              title={`${formatDate(w.weekStart)}: ${w.total.toLocaleString()} downloads`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-500">
        <span>{formatDate(trend[0]?.weekStart)}</span>
        <span>{formatDate(trend[trend.length - 1]?.weekStart)}</span>
      </div>
    </div>
  )
}

function LeaderboardRow({ episode, max }) {
  const pct = Math.max(4, (episode.downloads / max) * 100)
  return (
    <div className="rounded-xl border-2 border-gray-100 p-3 bg-white">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="font-bold text-sm leading-snug min-w-0 truncate">Ep {episode.number} · {episode.title}</p>
        <p className="text-xs font-bold text-gray-500 flex-shrink-0">{episode.downloads.toLocaleString()}</p>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-1">
        <div className="h-full bg-dl-red rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-gray-400">{formatDate(episode.publishedAt)}</p>
        {episode.daysLive < 7 && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
            🌱 {episode.daysLive}d in — still climbing
          </span>
        )}
      </div>
    </div>
  )
}

export default function AnalyticsClient({ episodes, trend }) {
  const hasData = episodes && episodes.length > 0
  const eligible = hasData ? episodes.filter(e => e.daysLive >= 7) : []
  const top = eligible[0] ?? null
  const bottom = eligible.length > 1 ? eligible[eligible.length - 1] : null
  const allTime = trend ? trend.reduce((sum, w) => sum + w.total, 0) : null
  const avgPerEpisode = hasData ? Math.round(episodes.reduce((s, e) => s + e.downloads, 0) / episodes.length) : null
  const maxDownloads = hasData ? Math.max(...episodes.map(e => e.downloads), 1) : 1

  return (
    <main className="pb-20 min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 pt-12">

        <h1 className="text-2xl font-bold mb-1">Analytics 📈</h1>
        <p className="text-sm text-gray-500 mb-4">See what's working — and do more of it.</p>

        {!episodes && !trend && (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <p className="font-bold text-gray-700 mb-1">Couldn't load analytics</p>
            <p className="text-xs text-gray-400">Check the Transistor API key/show ID are set.</p>
          </div>
        )}

        {(episodes || trend) && (
          <>
            <div className="bg-black text-white rounded-2xl p-5 mb-5 flex gap-6">
              <div className="flex-1 min-w-0">
                <div className="text-3xl font-black">{allTime != null ? allTime.toLocaleString() : '—'}</div>
                <div className="text-xs text-gray-400 mt-0.5">All-time downloads</div>
              </div>
              <div className="w-px bg-gray-700 self-stretch" />
              <div className="flex-1 min-w-0">
                <div className="text-3xl font-black">{avgPerEpisode != null ? avgPerEpisode.toLocaleString() : '—'}</div>
                <div className="text-xs text-gray-400 mt-0.5">Avg first-30-days</div>
              </div>
            </div>

            {(top || bottom) && (
              <div className="grid grid-cols-1 gap-3 mb-5">
                <EpisodeCallout emoji="🔥" label="Top Performer — do more of this" episode={top} tone="up" />
                <EpisodeCallout emoji="📉" label="Needs a Rethink — don't repeat this" episode={bottom} tone="down" />
              </div>
            )}

            <TrendChart trend={trend} />

            {hasData && (
              <>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">All Episodes</h2>
                <div className="space-y-2">
                  {episodes.map(ep => <LeaderboardRow key={ep.id} episode={ep} max={maxDownloads} />)}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </main>
  )
}
