import { NextResponse } from 'next/server'
import { notion, DB, extractTitle, extractSelect, extractNumber, extractDate, extractText } from '@/lib/notion-drench'

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: DB.EPISODES,
      sorts: [
        { property: 'Release Date', direction: 'ascending' },
        { property: 'Episode #', direction: 'ascending' },
      ],
    })

    const episodes = response.results.map(page => ({
      id: page.id,
      title: extractTitle(page),
      status: extractSelect(page.properties['Status']),
      episodeNumber: extractNumber(page.properties['Episode #']),
      recordingDate: extractDate(page.properties['Recording Date']),
      releaseDate: extractDate(page.properties['Release Date']),
      notes: extractText(page.properties['Notes']),
    }))

    return NextResponse.json({ episodes })
  } catch (err) {
    console.error('GET /api/notion/episodes', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { title, status, episodeNumber, recordingDate, releaseDate, notes } = body

    const page = await notion.pages.create({
      parent: { database_id: DB.EPISODES },
      properties: {
        Title: { title: [{ text: { content: title || 'Untitled Episode' } }] },
        Status: { select: { name: status || 'Idea' } },
        ...(episodeNumber != null && { 'Episode #': { number: episodeNumber } }),
        ...(recordingDate && { 'Recording Date': { date: { start: recordingDate } } }),
        ...(releaseDate && { 'Release Date': { date: { start: releaseDate } } }),
        ...(notes && { Notes: { rich_text: [{ text: { content: notes } }] } }),
      },
    })

    return NextResponse.json({ id: page.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/notion/episodes', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, title, status, episodeNumber, recordingDate, releaseDate, notes } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const properties = {}
    if (title != null) properties['Title'] = { title: [{ text: { content: title } }] }
    if (status != null) properties['Status'] = { select: { name: status } }
    if (episodeNumber != null) properties['Episode #'] = { number: episodeNumber }
    if (recordingDate !== undefined) properties['Recording Date'] = recordingDate ? { date: { start: recordingDate } } : { date: null }
    if (releaseDate !== undefined) properties['Release Date'] = releaseDate ? { date: { start: releaseDate } } : { date: null }
    if (notes != null) properties['Notes'] = { rich_text: [{ text: { content: notes } }] }

    await notion.pages.update({ page_id: id, properties })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/notion/episodes', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
