import { NextResponse } from 'next/server'
import { notion, DB } from '@/lib/notion-drench'

function getTitle(page) {
  const prop = Object.values(page.properties).find(p => p.type === 'title')
  return prop?.title?.[0]?.plain_text ?? ''
}
function getRichText(page, name) {
  return page.properties[name]?.rich_text?.map(t => t.plain_text).join('') ?? ''
}
function getNumber(page, name) {
  return page.properties[name]?.number ?? null
}
function getSelect(page, name) {
  return page.properties[name]?.select?.name ?? null
}
function getDate(page, name) {
  return page.properties[name]?.date?.start ?? null
}

export async function GET() {
  if (!DB.EXPENSES) {
    return NextResponse.json({ error: 'NOTION_EXPENSES_DB_ID not configured' }, { status: 503 })
  }
  try {
    const response = await notion.databases.query({
      database_id: DB.EXPENSES,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 100,
    })

    const expenses = response.results.map(page => ({
      id: page.id,
      description: getTitle(page),
      amount: getNumber(page, 'Amount'),
      category: getSelect(page, 'Category'),
      date: getDate(page, 'Date'),
      submittedBy: getRichText(page, 'Submitted By'),
    }))

    return NextResponse.json({ expenses })
  } catch (err) {
    console.error('GET /api/notion/expenses', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { description, amount, category, date, submittedBy } = body

    if (!description || amount == null) {
      return NextResponse.json({ error: 'description and amount are required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    const page = await notion.pages.create({
      parent: { database_id: DB.EXPENSES },
      properties: {
        Name: { title: [{ text: { content: description } }] },
        Amount: { number: parseFloat(amount) },
        ...(category && { Category: { select: { name: category } } }),
        Date: { date: { start: date || today } },
        ...(submittedBy && { 'Submitted By': { rich_text: [{ text: { content: submittedBy } }] } }),
      },
    })

    return NextResponse.json({ id: page.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/notion/expenses', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
