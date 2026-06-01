import { NextResponse } from 'next/server'
import { notion } from '@/lib/notion-drench'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const pageId = searchParams.get('pageId')
  if (!pageId) return NextResponse.json({ error: 'pageId required' }, { status: 400 })

  try {
    const response = await notion.comments.list({ block_id: pageId })
    const comments = response.results.map(c => ({
      id: c.id,
      text: c.rich_text.map(t => t.plain_text).join(''),
      createdTime: c.created_time,
    }))
    return NextResponse.json({ comments })
  } catch (err) {
    console.error('GET /api/notion/social-comment', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { pageId, author, text } = await req.json()
    if (!pageId || !text) return NextResponse.json({ error: 'pageId and text required' }, { status: 400 })

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    const content = author ? `${author} — ${timestamp}\n\n${text}` : `${timestamp}\n\n${text}`

    await notion.comments.create({
      parent: { page_id: pageId },
      rich_text: [{ type: 'text', text: { content } }],
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/notion/social-comment', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
