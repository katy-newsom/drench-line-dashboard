// One-time additive schema migration for the sponsorship restructure (Aug 2026).
// Adds new properties/options without touching anything existing. Safe to re-run.
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const { Client } = require('@notionhq/client')
const notion = new Client({ auth: process.env.NOTION_API_KEY })

async function main() {
  const sponsors = await notion.databases.retrieve({ database_id: process.env.NOTION_SPONSORS_DB_ID })
  const statusOptions = sponsors.properties['Status'].select.options.map(o => ({ name: o.name, color: o.color }))
  const hasInterested = statusOptions.some(o => o.name === 'Interested (Unconfirmed)')

  await notion.databases.update({
    database_id: process.env.NOTION_SPONSORS_DB_ID,
    properties: {
      'Invoice Status': {
        select: {
          options: [
            { name: 'Not Invoiced', color: 'gray' },
            { name: 'Invoiced', color: 'yellow' },
            { name: 'Paid', color: 'green' },
          ],
        },
      },
      'Exclusive Category': { checkbox: {} },
      'Archived': { checkbox: {} },
      'Status': {
        select: {
          options: hasInterested
            ? statusOptions
            : [...statusOptions, { name: 'Interested (Unconfirmed)', color: 'blue' }],
        },
      },
    },
  })
  console.log('✓ Sponsors DB updated: Invoice Status, Exclusive Category, Archived, Status option')

  await notion.databases.update({
    database_id: process.env.NOTION_PACKAGES_DB_ID,
    properties: {
      'Price': { rich_text: {} },
    },
  })
  console.log('✓ Packages DB updated: Price')
}

main().catch(e => { console.error('Migration failed:', e.message); process.exit(1) })
