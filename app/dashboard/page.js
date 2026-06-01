export const dynamic = 'force-dynamic'

import { notion, DB, extractTitle, extractSelect, extractDate } from '@/lib/notion-drench'
import DashboardClient from './DashboardClient'

async function getTransistorStats() {
  try {
    // Use the dedicated route which handles auth errors gracefully
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/transistor/stats`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
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
    console.error('[NextEpisode] Query failed:', e.message)
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
