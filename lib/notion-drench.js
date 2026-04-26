import { Client } from '@notionhq/client'

export const notion = new Client({ auth: process.env.NOTION_API_KEY })

export const DB = {
  TOPICS: process.env.NOTION_TOPICS_DB_ID,
  EPISODES: process.env.NOTION_EPISODES_DB_ID,
  TEAM: process.env.NOTION_TEAM_DB_ID,
  SPONSORS: process.env.NOTION_SPONSORS_DB_ID,
  EXPENSES: process.env.NOTION_EXPENSES_DB_ID,
  GUESTS: process.env.NOTION_GUESTS_DB_ID,
}

export function extractTitle(page) {
  const titleProp = Object.values(page.properties).find(p => p.type === 'title')
  return titleProp?.title?.[0]?.plain_text ?? ''
}

export function extractText(prop) {
  if (!prop) return ''
  if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text ?? ''
  if (prop.type === 'title') return prop.title?.[0]?.plain_text ?? ''
  return ''
}

export function extractSelect(prop) {
  return prop?.select?.name ?? null
}

export function extractNumber(prop) {
  return prop?.number ?? null
}

export function extractDate(prop) {
  return prop?.date?.start ?? null
}

export function extractRelation(prop) {
  return prop?.relation?.map(r => r.id) ?? []
}

// Ensures the Guests database exists; creates it if NOTION_GUESTS_DB_ID is not set
export async function ensureGuestsDb(parentPageId) {
  if (process.env.NOTION_GUESTS_DB_ID) return process.env.NOTION_GUESTS_DB_ID

  if (!parentPageId) {
    throw new Error('NOTION_GUESTS_DB_ID not set and no parent page provided to create it')
  }

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'Guests' } }],
    properties: {
      Name: { title: {} },
      Status: {
        select: {
          options: [
            { name: 'Pitched', color: 'gray' },
            { name: 'Confirmed', color: 'yellow' },
            { name: 'Recorded', color: 'blue' },
            { name: 'Aired', color: 'green' },
          ],
        },
      },
      Episode: { relation: { database_id: process.env.NOTION_EPISODES_DB_ID, single_property: {} } },
      Notes: { rich_text: {} },
      Contact: { rich_text: {} },
    },
  })
  return db.id
}
