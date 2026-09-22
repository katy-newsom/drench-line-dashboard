import { NextResponse } from 'next/server'
import { notion, DB, extractTitle, extractText } from '@/lib/notion-drench'

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: DB.TEAM,
      sorts: [{ property: 'Name', direction: 'ascending' }],
    })

    const team = response.results
      .map(page => ({
        id: page.id,
        name: extractTitle(page),
        role: extractText(page.properties['Role'] ?? page.properties['Roles'] ?? null),
      }))
      // Hide placeholder entries like "Editor/Social Hire (TBD)" — any name
      // with "TBD" inside parentheses is a role that hasn't been filled yet
      .filter(member => !/\([^)]*TBD[^)]*\)/i.test(member.name))

    return NextResponse.json({ team })
  } catch (err) {
    console.error('GET /api/notion/team', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
