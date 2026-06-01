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

// Transistor requires dd-mm-yyyy
function fmtDate(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

export async function GET() {
  if (!process.env.TRANSISTOR_API_KEY || !process.env.TRANSISTOR_SHOW_ID) {
    return NextResponse.json({ error: 'Transistor credentials not configured' }, { status: 503 })
  }

  try {
    // Find the show by slug
    const showsData = await transistorFetch('/shows')
    const slug = process.env.TRANSISTOR_SHOW_ID
    const show = (showsData?.data ?? []).find(
      s => s.attributes?.slug === slug || String(s.id) === slug
    )
    if (!show) throw new Error(`Show "${slug}" not found in Transistor`)
    const showId = show.id

    const now = new Date()
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const launchDate = new Date('2026-04-01') // show launched April 2026

    // Pull this week + all-time analytics + episodes list in parallel
    const [weekData, allTimeData, episodesData] = await Promise.all([
      transistorFetch(`/analytics/${showId}?start_date=${fmtDate(weekAgo)}&end_date=${fmtDate(now)}`),
      transistorFetch(`/analytics/${showId}?start_date=${fmtDate(launchDate)}&end_date=${fmtDate(now)}`),
      transistorFetch(`/episodes?show_id=${showId}&status=published&pagination[per]=100`),
    ])

    const thisWeek = (weekData?.data?.attributes?.downloads ?? [])
      .reduce((sum, d) => sum + (d.downloads ?? 0), 0)

    const allTime = (allTimeData?.data?.attributes?.downloads ?? [])
      .reduce((sum, d) => sum + (d.downloads ?? 0), 0)

    // Episodes list doesn't include download counts — show the latest episode title
    const episodes = episodesData?.data ?? []
    const bestEpisode = episodes[0]?.attributes?.title ?? null

    return NextResponse.json({ allTime, thisWeek, bestEpisode, bestEpisodeDownloads: 0 })
  } catch (err) {
    console.error('GET /api/transistor/stats', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
