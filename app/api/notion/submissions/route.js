import { NextResponse } from 'next/server'
import { notion, DB } from '@/lib/notion-drench'

function getRichText(page, name) {
  return page.properties[name]?.rich_text?.map(t => t.plain_text).join('') ?? ''
}
function getSelect(page, name) {
  return page.properties[name]?.select?.name ?? null
}
function getDate(page, name) {
  return page.properties[name]?.date?.start ?? null
}
function getTitle(page) {
  const prop = Object.values(page.properties).find(p => p.type === 'title')
  return prop?.title?.[0]?.plain_text ?? ''
}
function getNumber(page, name) {
  return page.properties[name]?.unique_id?.number ?? null
}
function getRelation(page, name) {
  return page.properties[name]?.relation?.map(r => r.id) ?? []
}

export async function GET() {
  if (!DB.SUBMISSIONS) {
    return NextResponse.json({ error: 'NOTION_SUBMISSIONS_DB_ID not configured' }, { status: 503 })
  }
  try {
    const response = await notion.databases.query({
      database_id: DB.SUBMISSIONS,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      page_size: 100,
    })

    const submissions = response.results.map(page => ({
      id: page.id,
      subId: getNumber(page, 'Sub ID'),
      question: getTitle(page),
      status: getSelect(page, 'Status'),
      category: getSelect(page, 'Category'),
      source: getSelect(page, 'Source'),
      submitterName: getRichText(page, 'Submitter Name'),
      dateReceived: getDate(page, 'Date Received'),
      notes: getRichText(page, 'Notes'),
      episodeUsed: getRelation(page, 'Episode Used'),
    }))

    return NextResponse.json({ submissions })
  } catch (err) {
    console.error('GET /api/notion/submissions', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  if (!DB.SUBMISSIONS) {
    return NextResponse.json({ error: 'NOTION_SUBMISSIONS_DB_ID not configured' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const { question, category, source, submitterName, dateReceived, notes } = body

    if (!question?.trim()) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    const page = await notion.pages.create({
      parent: { database_id: DB.SUBMISSIONS },
      properties: {
        Question: { title: [{ text: { content: question.trim() } }] },
        Status: { select: { name: 'New' } },
        ...(category && { Category: { select: { name: category } } }),
        ...(source && { Source: { select: { name: source } } }),
        ...(submitterName?.trim() && {
          'Submitter Name': { rich_text: [{ text: { content: submitterName.trim() } }] },
        }),
        ...(dateReceived && { 'Date Received': { date: { start: dateReceived } } }),
        ...(notes?.trim() && {
          Notes: { rich_text: [{ text: { content: notes.trim() } }] },
        }),
      },
    })

    return NextResponse.json({ id: page.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/notion/submissions', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  if (!DB.SUBMISSIONS) {
    return NextResponse.json({ error: 'NOTION_SUBMISSIONS_DB_ID not configured' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const { id, status, category, notes, episodeId } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const properties = {}
    if (status) properties['Status'] = { select: { name: status } }
    if (category) properties['Category'] = { select: { name: category } }
    if (notes != null) properties['Notes'] = { rich_text: [{ text: { content: notes } }] }
    if (episodeId) properties['Episode Used'] = { relation: [{ id: episodeId }] }

    await notion.pages.update({ page_id: id, properties })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/notion/submissions', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
