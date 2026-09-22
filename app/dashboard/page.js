export const dynamic = 'force-dynamic'

import { notion, DB, extractTitle, extractDate } from '@/lib/notion-drench'
import { transistorFetch, fmtDate, getShowId, LAUNCH_DATE } from '@/lib/transistor'
import { toSponsor, summarizeSponsors } from '@/lib/sponsors'
import DashboardClient from './DashboardClient'

async function getTransistorStats() {
  try {
    const showId = await getShowId()
    if (!showId) return null

    const now = new Date()
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const [weekData, allTimeData, episodesData] = await Promise.all([
      transistorFetch(`/analytics/${showId}?start_date=${fmtDate(weekAgo)}&end_date=${fmtDate(now)}`),
      transistorFetch(`/analytics/${showId}?start_date=${fmtDate(LAUNCH_DATE)}&end_date=${fmtDate(now)}`),
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

async function getSponsorSummary() {
  if (!DB.SPONSORS) return null
  try {
    const response = await notion.databases.query({ database_id: DB.SPONSORS, page_size: 100 })
    return summarizeSponsors(response.results.map(toSponsor))
  } catch (e) {
    console.error('[SponsorSummary]', e.message)
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
        const notes = page.properties['Notes']?.rich_text?.[0]?.plain_text ?? ''
        return { id: page.id, title: extractTitle(page), releaseDate, notes }
      }
    }
    return null
  } catch (e) {
    console.error('[NextEpisode]', e.message)
    return null
  }
}

export default async function DashboardPage() {
  const [transistor, nextEpisode, sponsorSummary] = await Promise.all([
    getTransistorStats(),
    getNextEpisode(),
    getSponsorSummary(),
  ])
  return <DashboardClient transistor={transistor} nextEpisode={nextEpisode} sponsorSummary={sponsorSummary} />
}
