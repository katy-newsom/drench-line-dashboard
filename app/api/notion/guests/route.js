import { NextResponse } from 'next/server'
import { notion, DB, extractTitle, extractSelect, extractText, extractRelation } from '@/lib/notion-drench'

function getGuestsDbId() {
  const id = process.env.NOTION_GUESTS_DB_ID
  if (!id) throw new Error('NOTION_GUESTS_DB_ID is not set. Create the Guests database in Notion and add the ID to your environment variables.')
  return id
}

export async function GET() {
  try {
    const dbId = getGuestsDbId()
    const response = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'Status', direction: 'ascending' }],
    })

    const guests = response.results.map(page => ({
      id: page.id,
      name: extractTitle(page),
      status: extractSelect(page.properties['Status']),
      notes: extractText(page.properties['Notes']),
      contact: extractText(page.properties['Contact Info']),
      episodeIds: extractRelation(page.properties['Episode']),
    }))

    return NextResponse.json({ guests })
  } catch (err) {
    console.error('GET /api/notion/guests', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const dbId = getGuestsDbId()
    const body = await req.json()
    const { name, status, notes, contact, episodeId } = body

    const properties = {
      Name: { title: [{ text: { content: name || 'Unknown Guest' } }] },
      Status: { select: { name: status || 'Pitched' } },
      ...(notes && { Notes: { rich_text: [{ text: { content: notes } }] } }),
      ...(contact && { 'Contact Info': { rich_text: [{ text: { content: contact } }] } }),
      ...(episodeId && { Episode: { relation: [{ id: episodeId }] } }),
    }

    const page = await notion.pages.create({ parent: { database_id: dbId }, properties })
    return NextResponse.json({ id: page.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/notion/guests', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, name, status, notes, contact, episodeId } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const properties = {}
    if (name != null) properties['Name'] = { title: [{ text: { content: name } }] }
    if (status != null) properties['Status'] = { select: { name: status } }
    if (notes != null) properties['Notes'] = { rich_text: [{ text: { content: notes } }] }
    if (contact != null) properties['Contact Info'] = { rich_text: [{ text: { content: contact } }] }
    if (episodeId != null) properties['Episode'] = { relation: episodeId ? [{ id: episodeId }] : [] }

    await notion.pages.update({ page_id: id, properties })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/notion/guests', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
