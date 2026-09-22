export const dynamic = 'force-dynamic'

import { getShowId, getEpisodePerformance, getWeeklyTrend } from '@/lib/transistor'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const showId = await getShowId()
  if (!showId) {
    return <AnalyticsClient episodes={null} trend={null} />
  }

  const [episodes, trend] = await Promise.all([
    getEpisodePerformance(showId),
    getWeeklyTrend(showId),
  ])

  return <AnalyticsClient episodes={episodes} trend={trend} />
}
