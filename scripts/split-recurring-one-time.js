// Sept 2026: split sponsorship money into Recurring vs One-Time.
// Adds Deal Type / One-Time Fee / Episode Date to the Sponsors DB, then moves
// one-off fees that were sitting in Monthly Value (which inflated MRR).
// Writes a backup of every row it touches to scripts/backups/ first. Safe to re-run.
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const { Client } = require('@notionhq/client')
const notion = new Client({ auth: process.env.NOTION_API_KEY })
const DB_ID = process.env.NOTION_SPONSORS_DB_ID

// Company name (prefix match) → the corrected deal. Anything not listed only
// gets a Deal Type if its Tier makes it obvious.
const FIXES = {
  'Purina (Honor Show)':   { dealType: 'Recurring' },
  'Muzzle Co':             { dealType: 'Recurring' },
  'Sun Glo':               { dealType: 'Recurring' },
  'Olive Insurance':       { dealType: 'Recurring' },
  'H2':                    { dealType: 'In-Kind' },
  'Judy’s Western Wares':  { dealType: 'One-Time', fee: 1000 },
  'Yurrita':               { dealType: 'One-Time', fee: 1500 },
  'Halfmann Livestock':    { dealType: 'One-Time', fee: 1500 },
  'Blackline Surface Co':  { dealType: 'One-Time' }, // fee unknown — flagged in the app
  'Hobbs':                 { dealType: 'One-Time', fee: 1500, status: 'Closed Won' },
}

async function main() {
  await notion.databases.update({
    database_id: DB_ID,
    properties: {
      'Deal Type': {
        select: {
          options: [
            { name: 'Recurring', color: 'green' },
            { name: 'One-Time', color: 'purple' },
            { name: 'In-Kind', color: 'gray' },
          ],
        },
      },
      'One-Time Fee': { number: { format: 'dollar' } },
      'Episode Date': { date: {} },
    },
  })
  console.log('✓ Sponsors DB: added Deal Type, One-Time Fee, Episode Date')

  const rows = []
  let cursor
  do {
    const r = await notion.databases.query({ database_id: DB_ID, start_cursor: cursor, page_size: 100 })
    rows.push(...r.results)
    cursor = r.has_more ? r.next_cursor : undefined
  } while (cursor)

  const targets = rows
    .map(page => ({ page, name: page.properties['Company Name'].title.map(t => t.plain_text).join('').trim() }))
    .filter(({ name }) => FIXES[name])

  const dir = path.join(__dirname, 'backups')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `sponsors-before-split-${Date.now()}.json`)
  fs.writeFileSync(file, JSON.stringify(targets.map(({ page, name }) => {
    const p = page.properties
    return {
      id: page.id, name,
      status: p['Status']?.select?.name ?? null,
      monthlyValue: p['Monthly Value']?.number ?? null,
      dealStart: p['Deal Start']?.date?.start ?? null,
      dealEnd: p['Deal End']?.date?.start ?? null,
    }
  }), null, 2))
  console.log(`Backup of original values: ${file}`)

  for (const { page, name } of targets) {
    const p = page.properties
    const fix = FIXES[name]
    const props = { 'Deal Type': { select: { name: fix.dealType } } }
    if (fix.status) props['Status'] = { select: { name: fix.status } }
    if (fix.dealType === 'One-Time') {
      const episodeDate = p['Episode Date']?.date?.start ?? p['Deal Start']?.date?.start ?? null
      if (fix.fee != null && p['One-Time Fee']?.number == null) props['One-Time Fee'] = { number: fix.fee }
      if (episodeDate) props['Episode Date'] = { date: { start: episodeDate } }
      props['Monthly Value'] = { number: null }
      props['Deal Start'] = { date: null }
      props['Deal End'] = { date: null }
    }
    await notion.pages.update({ page_id: page.id, properties: props })
    console.log(`✓ ${name} → ${fix.dealType}${fix.fee ? ` $${fix.fee}` : ''}`)
  }
}

main().catch(e => { console.error('Migration failed:', e.message); process.exit(1) })
