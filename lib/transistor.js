const TRANSISTOR_BASE = 'https://api.transistor.fm/v1'
const LAUNCH_DATE = new Date('2026-04-01')

export function fmtDate(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

// Transistor's analytics payloads use DD-MM-YYYY, which `new Date(str)`
// silently misparses as MM-DD-YYYY — convert to a real Date explicitly.
function parseTransistorDate(str) {
  if (!str) return null
  const [dd, mm, yyyy] = str.split('-').map(Number)
  return new Date(yyyy, mm - 1, dd)
}

export async function transistorFetch(path) {
  const res = await fetch(`${TRANSISTOR_BASE}${path}`, {
    headers: { 'x-api-key': process.env.TRANSISTOR_API_KEY },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Transistor ${res.status}`)
  return res.json()
}

export async function getShowId() {
  const apiKey = process.env.TRANSISTOR_API_KEY
  const slug = process.env.TRANSISTOR_SHOW_ID
  if (!apiKey || !slug) return null

  const showsData = await transistorFetch('/shows')
  const show = (showsData?.data ?? []).find(
    s => s.attributes?.slug === slug || String(s.id) === slug
  )
  return show?.id ?? null
}

// Downloads in each episode's first 30 days (or however many days it's
// actually been live, if less than 30) — the only apples-to-apples way to
// compare a brand-new episode against one that's been up for months.
export async function getEpisodePerformance(showId) {
  const episodesData = await transistorFetch(`/episodes?show_id=${showId}&status=published&pagination[per]=100`)
  const now = new Date()

  const episodes = await Promise.all((episodesData?.data ?? []).map(async ep => {
    const publishedAt = new Date(ep.attributes.published_at)
    const daysLive = Math.max(1, Math.floor((now - publishedAt) / (24 * 60 * 60 * 1000)))
    const windowEnd = new Date(Math.min(now, publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000))

    try {
      const analytics = await transistorFetch(
        `/analytics/episodes/${ep.id}?start_date=${fmtDate(publishedAt)}&end_date=${fmtDate(windowEnd)}`
      )
      const downloads = (analytics?.data?.attributes?.downloads ?? [])
        .reduce((sum, d) => sum + (d.downloads ?? 0), 0)
      return {
        id: ep.id,
        title: ep.attributes.title,
        number: ep.attributes.number,
        publishedAt: ep.attributes.published_at,
        downloads,
        daysLive: Math.min(daysLive, 30),
      }
    } catch {
      return null
    }
  }))

  return episodes
    .filter(Boolean)
    .sort((a, b) => b.downloads - a.downloads)
}

// Show-wide downloads since launch, bucketed into weekly totals.
export async function getWeeklyTrend(showId) {
  const now = new Date()
  const data = await transistorFetch(
    `/analytics/${showId}?start_date=${fmtDate(LAUNCH_DATE)}&end_date=${fmtDate(now)}`
  )
  const daily = data?.data?.attributes?.downloads ?? []

  const weeks = []
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7)
    const total = chunk.reduce((sum, d) => sum + (d.downloads ?? 0), 0)
    weeks.push({ weekStart: parseTransistorDate(chunk[0]?.date)?.toISOString() ?? null, total })
  }
  return weeks
}

export { LAUNCH_DATE }
