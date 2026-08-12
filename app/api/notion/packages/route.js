import { NextResponse } from 'next/server'
import { notion, DB } from '@/lib/notion-drench'

function getTitle(page) {
  const prop = Object.values(page.properties).find(p => p.type === 'title')
  return prop?.title?.[0]?.plain_text ?? ''
}
function getText(page, name) {
  return page.properties[name]?.rich_text?.map(t => t.plain_text).join('') ?? ''
}
function getCheckbox(page, name) {
  return page.properties[name]?.checkbox ?? false
}

export async function GET() {
  if (!DB.PACKAGES) {
    return NextResponse.json({ error: 'NOTION_PACKAGES_DB_ID not configured' }, { status: 503 })
  }
  try {
    const response = await notion.databases.query({
      database_id: DB.PACKAGES,
      filter: { property: 'Active', checkbox: { equals: true } },
    })

    const packages = response.results.map(page => ({
      id: page.id,
      name: getTitle(page),
      price: getText(page, 'Price'),
      deliverables: getText(page, 'Deliverables'),
      notes: getText(page, 'Notes'),
      active: getCheckbox(page, 'Active'),
    }))

    return NextResponse.json({ packages })
  } catch (err) {
    console.error('GET /api/notion/packages', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
