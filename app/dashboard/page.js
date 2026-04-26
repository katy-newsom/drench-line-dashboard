export const dynamic = 'force-dynamic'

import { notion, DB, extractTitle, extractSelect, extractDate } from '@/lib/notion-drench'
import DashboardClient from './DashboardClient'

const TRANSISTOR_BASE = 'https://api.transistor.fm/v1'

async function getTransistorStats() {
  const apiKey = process.env.TRANSISTOR_API_KEY
  const showSlug = process.env.TRANSISTOR_SHOW_ID

  if (!apiKey || !showSlug) return null

  const headers = { 'x-api-key': apiKey }

  try {
    const showsRes = await fetch(`${TRANSISTOR_BASE}/shows`, { headers })
    if (!showsRes.ok) return null
    const shows = (await showsRes.json())?.data ?? []
    const show = shows.find(s => s.attributes?.slug === showSlug || String(s.id) === showSlug)
    if (!show) return null

    const epRes = await fetch(
      `${TRANSISTOR_BASE}/episodes?show_id=${show.id}&status=published&pagination[per]=50`,
      { headers }
    )
    if (!epRes.ok) return null
    const episodes = (await epRes.json())?.data ?? []

    const latestEpisode = episodes[0]?.attributes?.title ?? null

    return { episodeCount: episodes.length, latestEpisode }
  } catch (e) {
    console.error('[Transistor] Unexpected error:', e.message)
    return null
  }
}

async function getWeeklyLeaderboard() {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  try {
    const response = await notion.databases.query({
      database_id: DB.TOPICS,
      filter: {
        timestamp: 'created_time',
        created_time: { on_or_after: weekStart.toISOString() },
      },
    })

    const counts = {}
    for (const page of response.results) {
      const submitter = page.properties['Submitted By']?.rich_text?.[0]?.plain_text ?? 'Unknown'
      counts[submitter] = (counts[submitter] ?? 0) + 1
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  } catch (e) {
    console.error('[Leaderboard] Query failed:', e.message)
    return []
  }
}

async function getEpisodeHealth() {
  try {
    const response = await notion.databases.query({
      database_id: DB.EPISODES,
      sorts: [{ property: 'Release Date', direction: 'ascending' }],
    })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let liveThisMonth = 0
    let nextEpisode = null
    const liveWeeks = new Set()

    for (const page of response.results) {
      const status = extractSelect(page.properties['Status'])
      const releaseDate = extractDate(page.properties['Release Date'])

      if (status === 'Live' && releaseDate) {
        const d = new Date(releaseDate)
        if (d >= monthStart && d <= now) liveThisMonth++
        const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))
        liveWeeks.add(weekNum)
      }

      if (!nextEpisode && releaseDate && new Date(releaseDate) > now) {
        nextEpisode = { title: extractTitle(page), releaseDate }
      }
    }

    let streak = 0
    const currentWeek = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000))
    for (let w = currentWeek; w >= currentWeek - 52; w--) {
      if (liveWeeks.has(w)) streak++
      else break
    }

    return { liveThisMonth, streak, nextEpisode }
  } catch (e) {
    console.error('[EpisodeHealth] Query failed:', e.message)
    return { liveThisMonth: 0, streak: 0, nextEpisode: null }
  }
}

export default async function DashboardPage() {
  const [stats, leaderboard, health] = await Promise.all([
    getTransistorStats(),
    getWeeklyLeaderboard(),
    getEpisodeHealth(),
  ])

  return <DashboardClient stats={stats} leaderboard={leaderboard} health={health} />
}
