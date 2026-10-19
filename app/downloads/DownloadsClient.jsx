'use client'

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TrendChart({ trend }) {
  if (!trend || trend.length === 0) return null
  const max = Math.max(...trend.map(w => w.total), 1)
  return (
    <div className="bg-card border border-line rounded-xl p-4 mb-5">
      <p className="eyebrow mb-4">By week</p>
      <div className="flex items-end gap-1 h-24">
        {trend.map((w, i) => (
          <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
            <div
              className="w-full rounded-t bg-accent"
              style={{ height: `${Math.max(4, (w.total / max) * 100)}%` }}
              title={`${formatDate(w.weekStart)}: ${w.total.toLocaleString()} downloads`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[11px] text-muted">
        <span>{formatDate(trend[0]?.weekStart)}</span>
        <span>{formatDate(trend[trend.length - 1]?.weekStart)}</span>
      </div>
    </div>
  )
}

function LeaderboardRow({ episode, max }) {
  const pct = Math.max(4, (episode.downloads / max) * 100)
  return (
    <div className="py-3 border-b border-line last:border-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="font-semibold text-sm leading-snug min-w-0">Ep {episode.number} · {episode.title}</p>
        <p className="text-sm font-semibold text-ink-2 flex-shrink-0 tabular-nums">{episode.downloads.toLocaleString()}</p>
      </div>
      <div className="h-1 rounded-full bg-line overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted mt-1">{formatDate(episode.publishedAt)}</p>
    </div>
  )
}

export default function DownloadsClient({ episodes, trend, thisWeek }) {
  const hasData = episodes && episodes.length > 0
  const allTime = trend ? trend.reduce((sum, w) => sum + w.total, 0) : null
  const maxDownloads = hasData ? Math.max(...episodes.map(e => e.downloads), 1) : 1

  return (
    <main className="pb-24 min-h-screen">
      <div className="max-w-lg mx-auto px-4 pt-16">
        <p className="eyebrow mb-2">Transistor</p>
        <h1 className="font-display text-[2rem] uppercase leading-none mb-2">Downloads</h1>
        <p className="text-sm text-ink-2 mb-5">How the show is doing. Not the social analytics site.</p>

        {!episodes && !trend && (
          <div className="border border-dashed border-line-strong rounded-xl p-10 text-center">
            <p className="font-semibold text-ink mb-1">Couldn&apos;t load downloads</p>
            <p className="text-xs text-muted">Check the Transistor API key and show id.</p>
          </div>
        )}

        {(episodes || trend) && (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="bg-card border border-line rounded-xl p-4">
                <p className="eyebrow">This week</p>
                <p className="font-display text-3xl mt-2 tabular-nums">{thisWeek != null ? thisWeek.toLocaleString() : '—'}</p>
              </div>
              <div className="bg-card border border-line rounded-xl p-4">
                <p className="eyebrow">All time</p>
                <p className="font-display text-3xl mt-2 tabular-nums">{allTime != null ? allTime.toLocaleString() : '—'}</p>
              </div>
            </div>

            <TrendChart trend={trend} />

            {hasData && (
              <>
                <h2 className="eyebrow mb-1">Episodes</h2>
                <div>
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
