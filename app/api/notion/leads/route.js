import { NextResponse } from 'next/server'
import { notion, DB } from '@/lib/notion-drench'

function getTitle(page) {
  const prop = Object.values(page.properties).find(p => p.type === 'title')
  return prop?.title?.[0]?.plain_text ?? ''
}
function getText(page, name) {
  return page.properties[name]?.rich_text?.map(t => t.plain_text).join('') ?? ''
}
function getSelect(page, name) {
  return page.properties[name]?.select?.name ?? null
}
function getDate(page, name) {
  return page.properties[name]?.date?.start ?? null
}
function getNumber(page, name) {
  return page.properties[name]?.number ?? null
}

export async function GET() {
  if (!DB.SPONSORS) {
    return NextResponse.json({ error: 'NOTION_SPONSORS_DB_ID not configured' }, { status: 503 })
  }
  try {
    const response = await notion.databases.query({
      database_id: DB.SPONSORS,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      page_size: 100,
    })

    const sponsors = response.results.map(page => ({
      id: page.id,
      companyName: getTitle(page),
      contactName: getText(page, 'Contact Name'),
      status: getSelect(page, 'Status'),
      tier: getSelect(page, 'Tier'),
      monthlyValue: getNumber(page, 'Monthly Value'),
      lastContactDate: getDate(page, 'Last Contact Date'),
      dealStart: getDate(page, 'Deal Start'),
      dealEnd: getDate(page, 'Deal End'),
      notes: getText(page, 'Notes'),
      flaggedBy: getText(page, 'Flagged By'),
    }))

    return NextResponse.json({ sponsors })
  } catch (err) {
    console.error('GET /api/notion/leads', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  if (!DB.SPONSORS) {
    return NextResponse.json({ error: 'NOTION_SPONSORS_DB_ID not configured' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const { companyName, contactName, notes, flaggedBy, tier, monthlyValue, status } = body

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 })
    }

    const page = await notion.pages.create({
      parent: { database_id: DB.SPONSORS },
      properties: {
        'Company Name': { title: [{ text: { content: companyName } }] },
        Status: { select: { name: status || 'Lead' } },
        ...(contactName?.trim() && { 'Contact Name': { rich_text: [{ text: { content: contactName.trim() } }] } }),
        ...(notes?.trim() && { Notes: { rich_text: [{ text: { content: notes.trim() } }] } }),
        ...(flaggedBy?.trim() && { 'Flagged By': { rich_text: [{ text: { content: flaggedBy.trim() } }] } }),
        ...(tier && { Tier: { select: { name: tier } } }),
        ...(monthlyValue != null && monthlyValue !== '' && { 'Monthly Value': { number: parseFloat(monthlyValue) } }),
        'Last Contact Date': { date: { start: new Date().toISOString().split('T')[0] } },
      },
    })

    return NextResponse.json({ id: page.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/notion/leads', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  if (!DB.SPONSORS) {
    return NextResponse.json({ error: 'NOTION_SPONSORS_DB_ID not configured' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const { id, status, tier, monthlyValue, contactName, notes, dealStart, dealEnd } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const properties = {}
    if (status) properties['Status'] = { select: { name: status } }
    if (tier) properties['Tier'] = { select: { name: tier } }
    if (monthlyValue != null) properties['Monthly Value'] = { number: parseFloat(monthlyValue) || null }
    if (contactName != null) properties['Contact Name'] = { rich_text: [{ text: { content: contactName } }] }
    if (notes != null) properties['Notes'] = { rich_text: [{ text: { content: notes } }] }
    if (dealStart != null) properties['Deal Start'] = dealStart ? { date: { start: dealStart } } : { date: null }
    if (dealEnd != null) properties['Deal End'] = dealEnd ? { date: { start: dealEnd } } : { date: null }
    // Always update last contact date on any edit
    properties['Last Contact Date'] = { date: { start: new Date().toISOString().split('T')[0] } }

    await notion.pages.update({ page_id: id, properties })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/notion/leads', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
