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

async function getSponsorSummary() {
  if (!DB.SPONSORS) return null
  try {
    const response = await notion.databases.query({ database_id: DB.SPONSORS, page_size: 100 })
    let mrr = 0, activeCount = 0, invoicesPending = 0, pipeline = 0, featuredBooked = 0

    for (const page of response.results) {
      const status = page.properties['Status']?.select?.name ?? 'Lead'
      const archived = page.properties['Archived']?.checkbox ?? false
      if (archived || status === 'Interested (Unconfirmed)') continue

      const monthlyValue = page.properties['Monthly Value']?.number ?? 0
      const invoiceStatus = page.properties['Invoice Status']?.select?.name ?? 'Not Invoiced'
      const isFeatured = (page.properties['Sponsorship Package']?.relation?.length ?? 0) > 0

      if (status === 'Closed Won') {
        activeCount++
        mrr += monthlyValue
        if (invoiceStatus !== 'Paid') invoicesPending++
        if (isFeatured) featuredBooked++
      } else if (status !== 'Closed Lost') {
        pipeline++
      }
    }

    return { activeCount, mrr, invoicesPending, pipeline, featuredBooked }
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
