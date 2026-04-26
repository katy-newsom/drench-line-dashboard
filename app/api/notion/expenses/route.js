import { NextResponse } from 'next/server'
import { notion, DB } from '@/lib/notion-drench'

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
