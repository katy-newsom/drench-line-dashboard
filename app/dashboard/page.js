export const dynamic = 'force-dynamic'

import { notion, DB, extractTitle, extractDate } from '@/lib/notion-drench'
import DashboardClient from './DashboardClient'

const TRANSISTOR_BASE = 'https://api.transistor.fm/v1'

function fmtDate(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

async function transistorFetch(path) {
  const res = await fetch(`${TRANSISTOR_BASE}${path}`, {
    headers: { 'x-api-key': process.env.TRANSISTOR_API_KEY },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Transistor ${res.status}`)
  return res.json()
}

async function getTransistorStats() {
  const apiKey = process.env.TRANSISTOR_API_KEY
  const slug = process.env.TRANSISTOR_SHOW_ID
  if (!apiKey || !slug) return null

  try {
    const showsData = await transistorFetch('/shows')
    const show = (showsData?.data ?? []).find(
      s => s.attributes?.slug === slug || String(s.id) === slug
    )
    if (!show) return null
    const showId = show.id

    const now = new Date()
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const launchDate = new Date('2026-04-01')

    const [weekData, allTimeData, episodesData] = await Promise.all([
      transistorFetch(`/analytics/${showId}?start_date=${fmtDate(weekAgo)}&end_date=${fmtDate(now)}`),
      transistorFetch(`/analytics/${showId}?start_date=${fmtDate(launchDate)}&end_date=${fmtDate(now)}`),
      transistorFetch(`/episodes?show_id=${showId}&status=published&pagination[per]=100`),
    ])

    const thisWeek = (weekData?.data?.attributes?.downloads ?? [])
      .reduce((sum, d) => sum + (d.downloads ?? 0), 0)
    const allTime = (allTimeData?.data?.attributes?.downloads ?? [])
      .reduce((sum, d) => sum + (d.downloads ?? 0), 0)
    const bestEpisode = (episodesData?.data ?? [])[0]?.attributes?.title ?? null

    return { allTime, thisWeek, bestEpisode }
  } catch (e) {
    console.error('[Transistor]', e.message)
    return null
  }
}

async function getNextEpisode() {
  try {
    const response = await notion.databases.query({
      database_id: DB.EPISODES,
      sorts: [{ property: 'Release Date', direction: 'ascending' }],
    })
    const now = new Date()
    for (const page of response.results) {
      const releaseDate = extractDate(page.properties['Release Date'])
      if (releaseDate && new Date(releaseDate) > now) {
        return { title: extractTitle(page), releaseDate }
      }
    }
    return null
  } catch (e) {
    console.error('[NextEpisode]', e.message)
    return null
  }
}

export default async function DashboardPage() {
  const [transistor, nextEpisode] = await Promise.all([
    getTransistorStats(),
    getNextEpisode(),
  ])
  return <DashboardClient transistor={transistor} nextEpisode={nextEpisode} />
}
