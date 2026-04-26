import { NextResponse } from 'next/server'
import { notion, DB, extractTitle, extractText } from '@/lib/notion-drench'

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: DB.TEAM,
      sorts: [{ property: 'Name', direction: 'ascending' }],
    })

    const team = response.results.map(page => ({
      id: page.id,
      name: extractTitle(page),
      role: extractText(page.properties['Role'] ?? page.properties['Roles'] ?? null),
    }))

    return NextResponse.json({ team })
  } catch (err) {
    console.error('GET /api/notion/team', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
