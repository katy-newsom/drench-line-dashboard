export const dynamic = 'force-dynamic'

import { transistorFetch, fmtDate, getShowId, getEpisodePerformance, getWeeklyTrend } from '@/lib/transistor'
import DownloadsClient from './DownloadsClient'

async function getThisWeek(showId) {
  const now = new Date()
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const weekData = await transistorFetch(
    `/analytics/${showId}?start_date=${fmtDate(weekAgo)}&end_date=${fmtDate(now)}`
  )
  return (weekData?.data?.attributes?.downloads ?? [])
    .reduce((sum, d) => sum + (d.downloads ?? 0), 0)
}

export default async function DownloadsPage() {
  const showId = await getShowId()
  if (!showId) {
    return <DownloadsClient episodes={null} trend={null} thisWeek={null} />
  }

  const [episodes, trend, thisWeek] = await Promise.all([
    getEpisodePerformance(showId),
    getWeeklyTrend(showId),
    getThisWeek(showId).catch(() => null),
  ])

  return <DownloadsClient episodes={episodes} trend={trend} thisWeek={thisWeek} />
}
