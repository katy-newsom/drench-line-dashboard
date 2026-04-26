import { NextResponse } from 'next/server'
import { notion, DB } from '@/lib/notion-drench'

export async function POST(req) {
  try {
    const body = await req.json()
    const { companyName, contactName, notes, flaggedBy } = body

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 })
    }

    const page = await notion.pages.create({
      parent: { database_id: DB.SPONSORS },
      properties: {
        Name: { title: [{ text: { content: companyName } }] },
        ...(contactName && { 'Contact Name': { rich_text: [{ text: { content: contactName } }] } }),
        ...(notes && { Notes: { rich_text: [{ text: { content: notes } }] } }),
        ...(flaggedBy && { 'Flagged By': { rich_text: [{ text: { content: flaggedBy } }] } }),
        'Date': { date: { start: new Date().toISOString().split('T')[0] } },
      },
    })

    return NextResponse.json({ id: page.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/notion/leads', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
