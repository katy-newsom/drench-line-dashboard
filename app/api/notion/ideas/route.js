import { NextResponse } from 'next/server'
import { notion, DB, extractTitle, extractSelect, extractText } from '@/lib/notion-drench'

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: DB.TOPICS,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    })

    const ideas = response.results.map(page => ({
      id: page.id,
      title: extractTitle(page),
      status: extractSelect(page.properties['Status']),
      notes: extractText(page.properties['Notes']),
      submittedBy: extractText(page.properties['Submitted By']),
    }))

    return NextResponse.json({ ideas })
  } catch (err) {
    console.error('GET /api/notion/ideas', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { title, notes, submittedBy } = body

    const page = await notion.pages.create({
      parent: { database_id: DB.TOPICS },
      properties: {
        Title: { title: [{ text: { content: title || 'Untitled Idea' } }] },
        Status: { select: { name: 'Idea' } },
        ...(notes && { Notes: { rich_text: [{ text: { content: notes } }] } }),
        ...(submittedBy && { 'Submitted By': { rich_text: [{ text: { content: submittedBy } }] } }),
      },
    })

    return NextResponse.json({ id: page.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/notion/ideas', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, title, status, notes } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const properties = {}
    if (title != null) properties['Title'] = { title: [{ text: { content: title } }] }
    if (status != null) properties['Status'] = { select: { name: status } }
    if (notes != null) properties['Notes'] = { rich_text: [{ text: { content: notes } }] }

    await notion.pages.update({ page_id: id, properties })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/notion/ideas', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
