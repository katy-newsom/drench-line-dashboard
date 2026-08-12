// One-time data entry from the Aug 2026 sponsorship conversation: logs
// Purina and Sun Glo for real, adds the still-unconfirmed "on the hook"
// names to the Interest List, and fixes Halfmann Livestock, which was
// already Closed Won but missing its Breeder Spotlight package link
// (and carrying its one-time $1,500 fee in "Monthly Value", which would
// wrongly inflate the new MRR dashboard stat).
const fs = require('fs')

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const { Client } = require('@notionhq/client')
const notion = new Client({ auth: process.env.NOTION_API_KEY })

const BREEDER_SPOTLIGHT_PKG_ID = '39c5111b-39f2-81c0-a2e4-d1ca6a5429b4'
const HALFMANN_ID = '39c5111b-39f2-8109-989a-eded3987d724'

async function main() {
  // Purina — confirmed Core sponsor, 3-mo, invoice + analytics owed
  await notion.pages.create({
    parent: { database_id: process.env.NOTION_SPONSORS_DB_ID },
    properties: {
      'Company Name': { title: [{ text: { content: 'Purina (Honor Show)' } }] },
      'Status': { select: { name: 'Closed Won' } },
      'Tier': { select: { name: 'CORE' } },
      'Monthly Value': { number: 800 },
      'Invoice Status': { select: { name: 'Not Invoiced' } },
      'Notes': { rich_text: [{ text: { content: '3-mo Core Sponsorship, may extend to 6. Send invoice + new analytics to Pgunn@landolakes.com, AJLea@landolakes.com, TJMazula@landolakes.com.' } }] },
      'Last Contact Date': { date: { start: '2026-08-03' } },
    },
  })
  console.log('✓ Purina (Honor Show) logged — Closed Won, CORE, invoice pending')

  // Sun Glo — in talks for Lead-tier category exclusivity, contingent on Purina renewal
  await notion.pages.create({
    parent: { database_id: process.env.NOTION_SPONSORS_DB_ID },
    properties: {
      'Company Name': { title: [{ text: { content: 'Sun Glo' } }] },
      'Status': { select: { name: 'In Talks' } },
      'Tier': { select: { name: 'LEAD' } },
      'Exclusive Category': { checkbox: true },
      'Notes': { rich_text: [{ text: { content: 'Expanding their small ruminant line. Wants to own the LEAD/category-partner slot for the full year — contingent on whether Purina’s Core deal renews past 3 months. Sponsor packet already sent (Aug 3).' } }] },
      'Last Contact Date': { date: { start: '2026-08-03' } },
    },
  })
  console.log('✓ Sun Glo logged — In Talks, LEAD tier, exclusive category flagged')

  // Still-unconfirmed names from Sam's Aug 3 "on the hook" list
  for (const name of ['Hobbs', 'Yurrita', 'Showrite']) {
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_SPONSORS_DB_ID },
      properties: {
        'Company Name': { title: [{ text: { content: name } }] },
        'Status': { select: { name: 'Interested (Unconfirmed)' } },
        'Notes': { rich_text: [{ text: { content: 'From Sam’s Aug 3 pipeline list — waiting on a reply before moving to real pipeline.' } }] },
        'Last Contact Date': { date: { start: '2026-08-03' } },
      },
    })
    console.log(`✓ ${name} logged — Interested (Unconfirmed)`)
  }

  // Fix: Halfmann Livestock is a one-off Breeder Spotlight deal, not a $1,500/mo recurring one
  await notion.pages.update({
    page_id: HALFMANN_ID,
    properties: {
      'Sponsorship Package': { relation: [{ id: BREEDER_SPOTLIGHT_PKG_ID }] },
      'Tier': { select: { name: 'Custom' } },
      'Monthly Value': { number: null },
      'Notes': { rich_text: [{ text: { content: 'Breeder Spotlight — $1,500 one-time. Potential sponsor for the fall goat-focused AI/bucks/flushing episode (mirrors format of the Matt Kennedy cattle episode).' } }] },
    },
  })
  console.log('✓ Halfmann Livestock linked to Breeder Spotlight, Monthly Value cleared (was wrongly counted as recurring)')
}

main().catch(e => { console.error('Seed failed:', e.message); process.exit(1) })
