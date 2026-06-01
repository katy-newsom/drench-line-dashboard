import { NextResponse } from 'next/server'

const SHEETS = [
  {
    id: '1dzCOjQlppFO8BWkTZwQ373VhCfh0tS7qxBIN3TiF7BU',
    source: 'Homepage Form',
    // Columns: Submitted On, Submit your question for Logan & Sam, Name, Email
    parse: (row) => ({
      date: row[0] ?? '',
      question: row[1] ?? '',
      name: row[2] ?? '',
      email: row[3] ?? '',
      extra: null,
    }),
  },
  {
    id: '1cgwGhVZIljUW8UWDgf1CYyW_Izoyfrbz2GnTnUQq5fY',
    source: 'Submit a Question Page',
    // Columns: Submitted On, Name, Email, What do you show, How can we help
    parse: (row) => ({
      date: row[0] ?? '',
      name: row[1] ?? '',
      email: row[2] ?? '',
      question: row[4] ?? '', // "How can we help"
      extra: row[3] ? `Shows: ${row[3]}` : null, // "What do you show"
    }),
  },
]

function parseCSV(text) {
  const lines = []
  let current = ''
  let inQuotes = false
  const rows = []
  let row = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      row.push(current.trim())
      current = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current || row.length) {
        row.push(current.trim())
        rows.push(row)
        row = []
        current = ''
      }
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else {
      current += ch
    }
  }
  if (current || row.length) {
    row.push(current.trim())
    rows.push(row)
  }
  return rows
}

async function fetchSheet(sheet) {
  const url = `https://docs.google.com/spreadsheets/d/${sheet.id}/export?format=csv`
  const res = await fetch(url, { next: { revalidate: 300 } }) // cache 5 min
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`)
  const text = await res.text()
  const rows = parseCSV(text)
  // Skip header row
  return rows.slice(1)
    .filter(row => row.some(cell => cell.trim()))
    .map(row => ({
      source: sheet.source,
      ...sheet.parse(row),
    }))
}

export async function GET() {
  try {
    const results = await Promise.allSettled(SHEETS.map(fetchSheet))

    const submissions = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        submissions.push(...result.value)
      }
    }

    // Sort newest first — dates come in as "M/D/YYYY H:MM:SS" or similar
    submissions.sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0)
      const db = b.date ? new Date(b.date) : new Date(0)
      return db - da
    })

    return NextResponse.json({ submissions })
  } catch (err) {
    console.error('GET /api/sheets/submissions', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
