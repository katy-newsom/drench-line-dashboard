import { NextResponse } from 'next/server'
import { notion, DB, queryAllDatabase } from '@/lib/notion-drench'
import {
  dateUpdate,
  isShootListUnavailable,
  pageInDatabase,
  shootPatchError,
  sortShoots,
  statusUpdate,
  toShoot,
} from '@/lib/shoots'

// object_not_found means this integration cannot see the database yet.
// Katy needs to share the Shoot List with the Notion integration.
function unavailable() {
  return NextResponse.json({ connected: false, items: [] })
}

export async function GET() {
  try {
    const pages = await queryAllDatabase({ database_id: DB.SHOOT_LIST })
    return NextResponse.json({ connected: true, items: sortShoots(pages.map(toShoot)) })
  } catch (err) {
    if (isShootListUnavailable(err)) return unavailable()
    console.error('GET /api/notion/shoots', err)
    return NextResponse.json({ error: err.message, connected: true }, { status: 500 })
  }
}

export async function PATCH(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const problem = shootPatchError(body)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  try {
    const page = await notion.pages.retrieve({ page_id: body.id })
    if (!pageInDatabase(page, DB.SHOOT_LIST)) {
      return NextResponse.json({ error: 'Not a shoot list item' }, { status: 404 })
    }

    const properties = {}
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      properties.Status = statusUpdate(page.properties?.Status, body.status)
    }
    if (Object.prototype.hasOwnProperty.call(body, 'targetDate')) {
      const iso = body.targetDate || null
      properties['Target Shoot Date'] = dateUpdate(page.properties?.['Target Shoot Date'], iso)
    }

    await notion.pages.update({ page_id: body.id, properties })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (isShootListUnavailable(err)) {
      return NextResponse.json({ error: "Shoot List isn't connected yet", connected: false }, { status: 409 })
    }
    console.error('PATCH /api/notion/shoots', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
