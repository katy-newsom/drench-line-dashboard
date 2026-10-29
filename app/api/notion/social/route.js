import { NextResponse } from 'next/server'
import { notion, DB, extractTitle, queryAllDatabase } from '@/lib/notion-drench'
import { labelsFromProperty } from '@/lib/shoots'
import {
  APPROVALS_NEEDED,
  REVIEWERS,
  formatStamp,
  isPlaceholderTeammate,
  isSocialCalendarPage,
  notionPropertyWrites,
  planReviewAction,
  schemaUpdates,
  socialCalendarDbId,
  socialReadError,
  sortSocialPosts,
  statusQueryFilter,
  toSocialPost,
} from '@/lib/social'

export const dynamic = 'force-dynamic'

// Drench Line HQ → Media System → Social Calendar.
// Set NOTION_SOCIAL_CALENDAR_DB_ID to point somewhere else.
// NOTION_CONTENT_DB_ID is the shared Umbarger calendar and is not used here.

function rolesFor(team, author) {
  const target = String(author || '').trim().toLowerCase()
  if (!target) return []
  const member = team.find(person => person.name.trim().toLowerCase() === target)
  return member?.roles || []
}

async function loadReviewTeam() {
  if (!DB.TEAM) return []
  try {
    const pages = await queryAllDatabase({ database_id: DB.TEAM })
    return pages
      .map(page => ({
        name: extractTitle(page),
        roles: labelsFromProperty(page.properties?.Role ?? page.properties?.Roles),
      }))
      .filter(member => member.name && !isPlaceholderTeammate(member.name))
  } catch (err) {
    console.error('Social team lookup failed', err?.message)
    return []
  }
}

async function ensureSocialSchema(databaseId) {
  const database = await notion.databases.retrieve({ database_id: databaseId })
  const { patch, warnings } = schemaUpdates(database.properties)
  if (Object.keys(patch).length) {
    try {
      await notion.databases.update({ database_id: databaseId, properties: patch })
    } catch (err) {
      warnings.push(
        `Could not update Social Calendar properties (${err.message}). Need Approved By (multi-select: ${REVIEWERS.join(', ')}), Canva Link (URL), Revision Notes (text), and a Status option named In Review.`,
      )
    }
  }
  return { properties: database.properties, warnings }
}

let katyLookup

async function katyMentionId() {
  if (!katyLookup) {
    katyLookup = (async () => {
      try {
        let cursor
        do {
          const response = await notion.users.list({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
          const match = (response.results || []).find(user => user?.type === 'person' && /^katy\b/i.test(user.name || ''))
          if (match?.id) return match.id
          cursor = response.has_more ? response.next_cursor : undefined
        } while (cursor)
        return null
      } catch (err) {
        console.error('Notion user lookup for Katy failed', err?.message)
        return null
      }
    })()
  }
  return katyLookup
}

async function postReviewComment(pageId, { author, body, mentionKaty }) {
  const text = `${author} — ${formatStamp(new Date())}\n\n${body}`
  if (mentionKaty) {
    const userId = await katyMentionId()
    if (userId) {
      try {
        await notion.comments.create({
          parent: { page_id: pageId },
          rich_text: [
            { type: 'mention', mention: { type: 'user', user: { object: 'user', id: userId } } },
            { type: 'text', text: { content: `\n${text}` } },
          ],
        })
        return
      } catch (err) {
        console.error('Katy mention failed', err?.message)
      }
    }
  }
  const content = mentionKaty ? `Katy — ${text}` : text
  await notion.comments.create({
    parent: { page_id: pageId },
    rich_text: [{ type: 'text', text: { content } }],
  })
}

export async function GET() {
  const databaseId = socialCalendarDbId()
  try {
    const { properties, warnings } = await ensureSocialSchema(databaseId)
    const pages = await queryAllDatabase({
      database_id: databaseId,
      filter: statusQueryFilter(properties?.Status),
    })
    const team = await loadReviewTeam()
    const items = sortSocialPosts(
      pages.map(toSocialPost).filter(item => item.status === 'In Edit' || item.status === 'In Review' || item.status === 'Ready to Post'),
    )
    return NextResponse.json({
      connected: true,
      items,
      reviewers: REVIEWERS,
      approvalsNeeded: APPROVALS_NEEDED,
      team,
      schemaWarnings: warnings,
    })
  } catch (err) {
    const mapped = socialReadError(err)
    console.error('GET /api/notion/social', err?.message)
    return NextResponse.json({
      error: mapped.error,
      connected: mapped.connected,
      items: [],
      reviewers: REVIEWERS,
      approvalsNeeded: APPROVALS_NEEDED,
    }, { status: mapped.status })
  }
}

export async function PATCH(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!body?.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const databaseId = socialCalendarDbId()
  try {
    const { warnings } = await ensureSocialSchema(databaseId)
    const page = await notion.pages.retrieve({ page_id: body.id })
    if (!isSocialCalendarPage(page)) {
      return NextResponse.json({ error: 'Not a Social Calendar post' }, { status: 404 })
    }

    const team = await loadReviewTeam()
    const author = typeof body.author === 'string' ? body.author : ''
    const plan = planReviewAction({
      action: body.action,
      author,
      roles: rolesFor(team, author),
      comment: body.comment,
      caption: body.caption,
      item: toSocialPost(page),
    })
    if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.statusCode })

    if (!plan.noop) {
      const properties = notionPropertyWrites(page.properties, plan.properties)
      await notion.pages.update({ page_id: body.id, properties })
    }

    let commented = false
    let warning = warnings.length ? warnings.join(' ') : undefined
    if (plan.comment) {
      try {
        await postReviewComment(body.id, {
          author: author.trim(),
          body: plan.comment,
          mentionKaty: Boolean(plan.mentionKaty),
        })
        commented = true
      } catch (err) {
        console.error('Social review comment failed', err?.message)
        const commentError = `Saved, but the Notion comment failed: ${err.message}`
        warning = warning ? `${warning} ${commentError}` : commentError
      }
    }

    return NextResponse.json({ ok: true, item: plan.item, commented, warning })
  } catch (err) {
    const mapped = socialReadError(err)
    console.error('PATCH /api/notion/social', err?.message)
    return NextResponse.json({ error: mapped.error, connected: mapped.connected }, { status: mapped.status })
  }
}
