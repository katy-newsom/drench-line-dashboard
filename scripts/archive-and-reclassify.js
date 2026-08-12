// Aug 11 follow-up: Katy confirmed the ~25 Status=Lead/undefined sponsors
// were never-contacted placeholder ideas (archive them). Hobbs and Yurrita
// are real Breeder Spotlight leads; Showrite is a likely Core sponsor.
const fs = require('fs')

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const { Client } = require('@notionhq/client')
const notion = new Client({ auth: process.env.NOTION_API_KEY })

const BREEDER_SPOTLIGHT_PKG_ID = '39c5111b-39f2-81c0-a2e4-d1ca6a5429b4'

const TO_ARCHIVE = [
  ['39c5111b-39f2-810b-bef6-d9ffdafc7761', 'Boot Barn'],
  ['39c5111b-39f2-8118-ad52-f6aac9cf4602', 'Camera System Co (TBD)'],
  ['39c5111b-39f2-8122-934b-c38b4740b101', 'Premier 1 Supplies'],
  ['39c5111b-39f2-813b-95ce-fe8ebb24e4ec', 'Rank 45'],
  ['39c5111b-39f2-8146-a285-ec63b07102cb', 'FUB (bank)'],
  ['39c5111b-39f2-815a-a12c-dbc8249b483f', 'Ram Trucks'],
  ['39c5111b-39f2-8183-b076-f771ed39a544', 'Cedar Bedding/Shavings Co (TBD)'],
  ['39c5111b-39f2-8193-a152-e89f0a3cbbeb', 'Tractor Dealership (TBD)'],
  ['39c5111b-39f2-8193-a67d-c87cf1ee221a', 'Bobcat'],
  ['39c5111b-39f2-819e-9254-c75e43310758', 'Ranch Water Co'],
  ['39c5111b-39f2-81a9-a9b3-cf32fe6d603c', 'Lometa Gate Company'],
  ['39c5111b-39f2-81cb-b171-c793a2b181d9', 'Ranch Fuel'],
  ['39c5111b-39f2-81e0-8f31-d976fd01f228', 'Fly System Co (TBD)'],
  ['39c5111b-39f2-81e1-bb40-f0dd866c7a6c', 'Rio Bank'],
  ['39c5111b-39f2-81e6-a911-f752ec457bf1', 'Bajío Sunglasses'],
  ['38a5111b-39f2-80be-9110-ec1ee627666d', 'Show Smart'],
  ['37c5111b-39f2-8182-9e11-d8120b1720da', 'Showman App'],
  ['37c5111b-39f2-814a-b1dd-fe7accd06e1b', 'H2'],
  ['37b5111b-39f2-812c-bf5e-c4e0e745ba98', 'South Plains College'],
  ['37b5111b-39f2-81b4-b7fa-dae2372884c6', 'NXTGen Sales'],
  ['34b5111b-39f2-809f-9ece-c1ddb781b470', 'Transporation/haulers'],
  ['34b5111b-39f2-80c3-942a-d9c1405be5a7', 'Treadmills'],
  ['34b5111b-39f2-80ef-8be3-ccbd6f23702f', 'Weaver'],
  ['34b5111b-39f2-8033-b807-c39e8838285e', 'Sullivan’s'],
  ['34b5111b-39f2-8008-bae8-f2e247d3c17d', 'Trailer dealership'],
]

async function main() {
  for (const [id, name] of TO_ARCHIVE) {
    await notion.pages.update({ page_id: id, properties: { Archived: { checkbox: true } } })
    console.log(`✓ archived: ${name}`)
  }

  for (const [id, name] of [['3b95111b-39f2-81ff-9e06-d3550f26b39b', 'Hobbs'], ['3b95111b-39f2-81db-8c9d-c27e67207526', 'Yurrita']]) {
    await notion.pages.update({
      page_id: id,
      properties: {
        Status: { select: { name: 'Lead' } },
        'Sponsorship Package': { relation: [{ id: BREEDER_SPOTLIGHT_PKG_ID }] },
        Notes: { rich_text: [{ text: { content: 'Breeder Spotlight candidate. From Sam’s Aug 3 pipeline list — confirmed real lead.' } }] },
      },
    })
    console.log(`✓ promoted: ${name} → Lead, Breeder Spotlight`)
  }

  await notion.pages.update({
    page_id: '3b95111b-39f2-81ef-9eba-ce63f840aef5',
    properties: {
      Status: { select: { name: 'Lead' } },
      Tier: { select: { name: 'CORE' } },
      Notes: { rich_text: [{ text: { content: 'Likely Core sponsorship. From Sam’s Aug 3 pipeline list — confirmed real lead.' } }] },
    },
  })
  console.log('✓ promoted: Showrite → Lead, CORE (bet)')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
