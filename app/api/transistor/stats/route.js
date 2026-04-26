import { NextResponse } from 'next/server'

const BASE = 'https://api.transistor.fm/v1'

async function transistorFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-api-key': process.env.TRANSISTOR_API_KEY },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Transistor API error: ${res.status}`)
  return res.json()
}

export async function GET() {
  if (!process.env.TRANSISTOR_API_KEY || !process.env.TRANSISTOR_SHOW_ID) {
    return NextResponse.json({ error: 'Transistor credentials not configured' }, { status: 503 })
  }

  try {
    const showId = process.env.TRANSISTOR_SHOW_ID

    const [analyticsData, episodesData] = await Promise.all([
      transistorFetch(`/analytics/${showId}`),
      transistorFetch(`/episodes?show_id=${showId}&pagination[per]=50&pagination[page]=1`),
    ])

    const allTime = analyticsData?.data?.attributes?.downloads?.overall ?? 0

    // This week: last 7 days
    const now = new Date()
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const weekStart = weekAgo.toISOString().split('T')[0]
    const weekEnd = now.toISOString().split('T')[0]

    let thisWeek = 0
    try {
      const weekData = await transistorFetch(`/analytics/${showId}?start_date=${weekStart}&end_date=${weekEnd}`)
      thisWeek = weekData?.data?.attributes?.downloads?.overall ?? 0
    } catch {
      // non-fatal
    }

    // Best episode by downloads
    const episodes = episodesData?.data ?? []
    let bestEpisode = null
    let bestCount = 0

    for (const ep of episodes) {
      const downloads = ep.attributes?.downloads_count ?? 0
      if (downloads > bestCount) {
        bestCount = downloads
        bestEpisode = ep.attributes?.title ?? 'Unknown'
      }
    }

    return NextResponse.json({
      allTime,
      thisWeek,
      bestEpisode,
      bestEpisodeDownloads: bestCount,
    })
  } catch (err) {
    console.error('GET /api/transistor/stats', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
