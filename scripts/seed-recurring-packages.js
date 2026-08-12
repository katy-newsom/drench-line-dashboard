// Seeds BASE/CORE/LEAD as rows in the Packages DB (transcribed from
// DrenchLineSponsorship_08.04_26.pdf) so the app's deliverables reference
// card can pull from one place instead of mixing hardcoded + Notion content.
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const { Client } = require('@notionhq/client')
const notion = new Client({ auth: process.env.NOTION_API_KEY })

const PACKAGES = [
  {
    name: 'BASE Partner',
    price: '$500/month · 3-month minimum · Total $1,500',
    deliverables: ':30 host-read ad. Show notes link. Social tag in clip posts. Website banner placement.',
  },
  {
    name: 'CORE Partner',
    price: '$800/month · 3-month minimum · Total $2,400',
    deliverables: ':30 host-read ad. Show notes link. Social tag in clip posts. Website banner. One dedicated sponsored social post/month. One joint social media giveaway per term.',
  },
  {
    name: 'LEAD Partner (Official Category Partner)',
    price: '$1,500/month · 6-month commitment',
    deliverables: 'Exclusive feed, supplement, trailer, insurance, pharmaceutical, or equipment partner in your category. Two guest interviews. Host-read ads. Social media integrations. Website placement. Discount codes. Co-branded merch. Joint giveaways. Product mentions.',
  },
]

async function main() {
  for (const pkg of PACKAGES) {
    const existing = await notion.databases.query({
      database_id: process.env.NOTION_PACKAGES_DB_ID,
      filter: { property: 'Package Name', title: { equals: pkg.name } },
    })
    if (existing.results.length > 0) {
      console.log(`- skip (exists): ${pkg.name}`)
      continue
    }
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_PACKAGES_DB_ID },
      properties: {
        'Package Name': { title: [{ text: { content: pkg.name } }] },
        'Active': { checkbox: true },
        'Price': { rich_text: [{ text: { content: pkg.price } }] },
        'Deliverables': { rich_text: [{ text: { content: pkg.deliverables } }] },
        'Notes': { rich_text: [{ text: { content: 'From Aug 2026 sponsorship flyer (DrenchLineSponsorship_08.04_26.pdf).' } }] },
      },
    })
    console.log(`✓ created: ${pkg.name}`)
  }
}

main().catch(e => { console.error('Seed failed:', e.message); process.exit(1) })
