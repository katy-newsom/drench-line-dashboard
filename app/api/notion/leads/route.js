import { NextResponse } from 'next/server'
import { notion, DB, queryAllDatabase } from '@/lib/notion-drench'
import { toSponsor } from '@/lib/sponsors'

export async function GET() {
  if (!DB.SPONSORS) {
    return NextResponse.json({ error: 'NOTION_SPONSORS_DB_ID not configured' }, { status: 503 })
  }
  try {
    // Same sort as before, but every page. A single page_size of 100 used to
    // disagree with the old home-screen query, which asked for a different 100.
    const pages = await queryAllDatabase({
      database_id: DB.SPONSORS,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    })

    const sponsors = pages.map(toSponsor)

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
    const { companyName, contactName, notes, flaggedBy, tier, dealType, monthlyValue, oneTimeFee, episodeDate, status, invoiceStatus, exclusiveCategory, packageIds } = body

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
        ...(dealType && { 'Deal Type': { select: { name: dealType } } }),
        ...(monthlyValue != null && monthlyValue !== '' && { 'Monthly Value': { number: parseFloat(monthlyValue) } }),
        ...(oneTimeFee != null && oneTimeFee !== '' && { 'One-Time Fee': { number: parseFloat(oneTimeFee) } }),
        ...(episodeDate && { 'Episode Date': { date: { start: episodeDate } } }),
        'Invoice Status': { select: { name: invoiceStatus || 'Not Invoiced' } },
        ...(exclusiveCategory != null && { 'Exclusive Category': { checkbox: !!exclusiveCategory } }),
        ...(packageIds?.length > 0 && { 'Sponsorship Package': { relation: packageIds.map(id => ({ id })) } }),
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
    const { id, status, tier, dealType, monthlyValue, oneTimeFee, episodeDate, contactName, notes, dealStart, dealEnd, invoiceStatus, exclusiveCategory, archived, packageIds } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const properties = {}
    if (status) properties['Status'] = { select: { name: status } }
    if (tier !== undefined) properties['Tier'] = tier ? { select: { name: tier } } : { select: null }
    if (dealType) properties['Deal Type'] = { select: { name: dealType } }
    if (monthlyValue !== undefined) properties['Monthly Value'] = { number: monthlyValue === null || monthlyValue === '' ? null : parseFloat(monthlyValue) }
    if (oneTimeFee !== undefined) properties['One-Time Fee'] = { number: oneTimeFee === null || oneTimeFee === '' ? null : parseFloat(oneTimeFee) }
    if (episodeDate !== undefined) properties['Episode Date'] = episodeDate ? { date: { start: episodeDate } } : { date: null }
    if (contactName != null) properties['Contact Name'] = { rich_text: [{ text: { content: contactName } }] }
    if (notes != null) properties['Notes'] = { rich_text: [{ text: { content: notes } }] }
    if (dealStart !== undefined) properties['Deal Start'] = dealStart ? { date: { start: dealStart } } : { date: null }
    if (dealEnd !== undefined) properties['Deal End'] = dealEnd ? { date: { start: dealEnd } } : { date: null }
    if (invoiceStatus) properties['Invoice Status'] = { select: { name: invoiceStatus } }
    if (exclusiveCategory != null) properties['Exclusive Category'] = { checkbox: !!exclusiveCategory }
    if (archived != null) properties['Archived'] = { checkbox: !!archived }
    if (packageIds != null) properties['Sponsorship Package'] = { relation: packageIds.map(pid => ({ id: pid })) }
    // Always update last contact date on any edit
    properties['Last Contact Date'] = { date: { start: new Date().toISOString().split('T')[0] } }

    await notion.pages.update({ page_id: id, properties })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/notion/leads', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
