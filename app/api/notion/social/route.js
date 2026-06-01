import { NextResponse } from 'next/server'
import { notion } from '@/lib/notion-drench'

// The Notion page ID for the "Drench Line" record in the Clients database
const DRENCH_CLIENT_PAGE_ID = process.env.NOTION_DRENCH_CLIENT_PAGE_ID ?? '35f5111b39f2802cbea0e0d80ba436aa'

// The shared content calendar database ID (same one Umbarger uses)
const CONTENT_DB_ID = process.env.NOTION_CONTENT_DB_ID

function getTitle(page) {
  const prop = Object.values(page.properties).find(p => p.type === 'title')
  return prop?.title?.[0]?.plain_text ?? 'Untitled'
}

function getSelect(page, name) {
  return page.properties[name]?.select?.name ?? null
}

function getMultiSelect(page, name) {
  return page.properties[name]?.multi_select?.map(s => s.name) ?? []
}

function getDate(page, name) {
  return page.properties[name]?.date?.start ?? null
}

function getUrl(page, name) {
  return page.properties[name]?.url ?? null
}

function getRichText(page, name) {
  return page.properties[name]?.rich_text?.map(t => t.plain_text).join('') ?? null
}

function getRelationIds(page, name) {
  return page.properties[name]?.relation?.map(r => r.id.replace(/-/g, '')) ?? []
}

export async function GET() {
  if (!CONTENT_DB_ID) {
    return NextResponse.json({ error: 'NOTION_CONTENT_DB_ID not configured' }, { status: 503 })
  }

  try {
    const normalizedClientId = DRENCH_CLIENT_PAGE_ID.replace(/-/g, '')

    const response = await notion.databases.query({
      database_id: CONTENT_DB_ID,
      filter: {
        or: [
          { property: 'Status', select: { equals: 'Drafting' } },
          { property: 'Status', select: { equals: 'Internal Review' } },
          { property: 'Status', select: { equals: 'Scheduled' } },
          { property: 'Status', select: { equals: 'Live' } },
          { property: 'Status', select: { equals: 'Approved' } },
        ],
      },
      sorts: [{ property: 'Publish Date', direction: 'ascending' }],
    })

    const items = response.results
      .filter(page => {
        const clientIds = getRelationIds(page, 'Clients')
        return clientIds.includes(normalizedClientId)
      })
      .map(page => ({
        id: page.id,
        title: getTitle(page),
        status: getSelect(page, 'Status'),
        contentType: getSelect(page, 'Content Type'),
        format: getSelect(page, 'Format'),
        platform: getMultiSelect(page, 'Platform'),
        publishDate: getDate(page, 'Publish Date'),
        driveLink: getUrl(page, 'Drive Link'),
        caption: getRichText(page, 'Caption'),
      }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET /api/notion/social', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
