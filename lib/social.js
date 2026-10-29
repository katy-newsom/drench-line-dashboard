import { dateFromProperty, labelsFromProperty, textFromProperty, urlFromProperty } from './shoots.js'

// Drench Line HQ → Media System → Social Calendar.
// https://www.notion.so/75f927092fdd4e22a9e4f9a974560f05
// Data source 40adab62-a73e-408b-9e3f-9b0993186356.
// Override the database id with NOTION_SOCIAL_CALENDAR_DB_ID.
// This is not the shared Umbarger content calendar (NOTION_CONTENT_DB_ID).
export const SOCIAL_CALENDAR_DB_FALLBACK = '75f927092fdd4e22a9e4f9a974560f05'
export const SOCIAL_CALENDAR_DATA_SOURCE_ID = '40adab62-a73e-408b-9e3f-9b0993186356'

// Approved By option labels. Jenny Bett is her own reviewer, not Conner.
// Editor/Social Hire (TBD) is not a reviewer.
export const REVIEWERS = ['Sam', 'Logan', 'Jurahee', 'Conner', 'Jenny Bett']
export const APPROVALS_NEEDED = 2
export const GATE_LABEL = `${APPROVALS_NEEDED} of ${REVIEWERS.length}`
export const REVIEW_STATUSES = ['In Edit', 'In Review', 'Ready to Post']
export const WRITABLE_STATUSES = ['In Edit', 'In Review', 'Ready to Post']

const REVIEWER_COLORS = {
  Sam: 'blue',
  Logan: 'green',
  Jurahee: 'purple',
  Conner: 'orange',
  'Jenny Bett': 'pink',
}

export const SOCIAL_CALENDAR_CONNECT_HINT = 'Social Calendar is not connected. In Notion, open Drench Line HQ → Media System → Social Calendar, choose ••• → Connections, and add the integration this app uses so it can read and update posts.'

export function socialCalendarDbId(env = process.env) {
  const configured = env?.NOTION_SOCIAL_CALENDAR_DB_ID
  if (configured && String(configured).trim()) return String(configured).trim()
  return SOCIAL_CALENDAR_DB_FALLBACK
}

export function sameId(a, b) {
  return String(a || '').replace(/-/g, '').toLowerCase() === String(b || '').replace(/-/g, '').toLowerCase()
}

export function socialCalendarIds(env = process.env) {
  const databaseId = socialCalendarDbId(env)
  const ids = [databaseId]
  if (sameId(databaseId, SOCIAL_CALENDAR_DB_FALLBACK)) ids.push(SOCIAL_CALENDAR_DATA_SOURCE_ID)
  return ids
}

export function isSocialCalendarPage(page, env = process.env) {
  const parent = page?.parent || {}
  const parentId = parent.database_id || parent.data_source_id || ''
  if (!parentId) return false
  return socialCalendarIds(env).some(id => sameId(id, parentId))
}

export function isPlaceholderTeammate(name) {
  return /\([^)]*TBD[^)]*\)/i.test(String(name || ''))
}

export function isKaty(name) {
  const trimmed = String(name || '').trim().toLowerCase()
  return trimmed === 'katy' || trimmed.startsWith('katy ')
}

export function isProducerRole(roles) {
  const list = Array.isArray(roles) ? roles : String(roles || '').split(',')
  return list.some(role => /producer/i.test(String(role)))
}

// Who's here stores the Team & Roles title. Approved By stores the short label.
export function matchReviewer(name, reviewers = REVIEWERS) {
  const trimmed = String(name || '').trim()
  if (!trimmed || isPlaceholderTeammate(trimmed)) return null
  const lower = trimmed.toLowerCase()
  const exact = reviewers.find(reviewer => reviewer.toLowerCase() === lower)
  if (exact) return exact
  if (lower === 'jenny bett newsom' || lower.startsWith('jenny bett ')) {
    return reviewers.find(reviewer => reviewer.toLowerCase() === 'jenny bett') || null
  }
  const first = trimmed.split(/\s+/)[0]
  if (first.toLowerCase() === 'jenny') return null
  const byFirst = reviewers.find(reviewer => reviewer.toLowerCase() === first.toLowerCase())
  if (byFirst) return byFirst
  // JB is Conner's nickname unless JB is its own Approved By option.
  if (/^jb\b/i.test(trimmed) && !reviewers.some(reviewer => reviewer.toLowerCase() === 'jb')) {
    return reviewers.find(reviewer => reviewer.toLowerCase() === 'conner') || null
  }
  return null
}

export function capabilitiesFor(name, roles = []) {
  const reviewer = matchReviewer(name)
  const producer = isKaty(name) || isProducerRole(roles)
  return {
    reviewer,
    canApprove: Boolean(reviewer),
    canRequestEdits: Boolean(reviewer) || producer,
    canSendToReview: producer,
    canOverride: isKaty(name),
    canEditCaption: Boolean(reviewer) || producer,
  }
}

export function orderedApprovers(names, reviewers = REVIEWERS) {
  const have = new Set()
  for (const name of names || []) {
    const match = reviewers.find(reviewer => reviewer.toLowerCase() === String(name).trim().toLowerCase())
    if (match) have.add(match)
  }
  return reviewers.filter(reviewer => have.has(reviewer))
}

export function approvalCount(names, reviewers = REVIEWERS) {
  return orderedApprovers(names, reviewers).length
}

export function approvalCounter(count, needed = APPROVALS_NEEDED, total = REVIEWERS.length) {
  const safe = Number.isFinite(count) ? count : 0
  if (safe >= needed) return `${safe} of ${total} approved`
  return `${safe} of ${total} · ${needed} of ${total} needed`
}

export function approveHelp(caps, status, already) {
  if (!caps?.canApprove) return 'Only Sam, Logan, Jurahee, Conner, and Jenny Bett can approve.'
  if (already) return `You already approved as ${caps.reviewer}.`
  if (status === 'Ready to Post') return null
  if (status !== 'In Review') return 'Katy sends this to In Review before anyone can approve.'
  return null
}

export function nameList(names) {
  const list = names || []
  if (list.length <= 1) return list[0] || ''
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`
}

export function reviewCommentBody(action, { approvedBy, comment } = {}) {
  if (action === 'approve') {
    return `Ready to post. ${nameList(approvedBy)} approved. ${GATE_LABEL} reached. This does not publish the post.`
  }
  if (action === 'override') {
    return `Override: marked Ready to Post without ${GATE_LABEL} approvals. This does not publish the post.`
  }
  if (action === 'request-edits') {
    return `Asked for edits.\n\n${comment}`
  }
  return null
}

export function formatStamp(date) {
  const value = date instanceof Date ? date : new Date(date)
  return value.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function keptOption(option) {
  if (!option?.name) return null
  const next = { name: option.name }
  if (option.id) next.id = option.id
  if (option.color) next.color = option.color
  return next
}

export function withInReviewOption(options) {
  const list = (options || []).map(keptOption).filter(Boolean)
  if (list.some(option => option.name === 'In Review')) return list
  const inEdit = list.findIndex(option => option.name === 'In Edit')
  const ready = list.findIndex(option => option.name === 'Ready to Post')
  const insertAt = inEdit >= 0 ? inEdit + 1 : (ready >= 0 ? ready : list.length)
  const next = [...list]
  next.splice(insertAt, 0, { name: 'In Review', color: 'pink' })
  return next
}

export function schemaUpdates(properties, reviewers = REVIEWERS) {
  const props = properties || {}
  const patch = {}
  const warnings = []

  // An empty property map means the retrieve didn't include the schema.
  // Don't invent a new Status or Approved By list over the real one.
  if (!Object.keys(props).length) {
    return {
      patch,
      warnings: ['Social Calendar properties could not be read. Expected Post Title, Status (with In Review), Caption Draft, Approved By, Canva Link, and Revision Notes.'],
    }
  }

  const approved = props['Approved By']
  if (!approved) {
    patch['Approved By'] = {
      multi_select: {
        options: reviewers.map(name => ({ name, color: REVIEWER_COLORS[name] || 'default' })),
      },
    }
  } else if (approved.type !== 'multi_select') {
    warnings.push('Approved By exists but is not a multi-select. Approvals need a multi-select named Approved By.')
  } else {
    const existing = (approved.multi_select?.options || []).map(keptOption).filter(Boolean)
    if (!existing.length) {
      warnings.push(`Could not read Approved By options. They should be ${reviewers.join(', ')}.`)
    } else {
      const missing = reviewers.filter(name => !existing.some(option => option.name === name))
      if (missing.length) {
        patch['Approved By'] = {
          multi_select: {
            options: [
              ...existing,
              ...missing.map(name => ({ name, color: REVIEWER_COLORS[name] || 'default' })),
            ],
          },
        }
      }
    }
  }

  if (!props['Canva Link']) {
    patch['Canva Link'] = { url: {} }
  } else if (props['Canva Link'].type !== 'url') {
    warnings.push('Canva Link exists but is not a URL property.')
  }

  if (!props['Revision Notes']) {
    patch['Revision Notes'] = { rich_text: {} }
  }

  const status = props.Status
  if (!status) {
    warnings.push('Status property is missing.')
  } else if (status.type === 'select') {
    const options = status.select?.options || []
    if (!options.length) {
      warnings.push('Could not read Status options. Add In Review between In Edit and Ready to Post if it is missing.')
    } else if (!options.some(option => option.name === 'In Review')) {
      patch.Status = { select: { options: withInReviewOption(options) } }
    }
  } else if (status.type === 'status') {
    const options = status.status?.options || []
    if (!options.some(option => option.name === 'In Review')) {
      warnings.push('Add an In Review option on Status, between In Edit and Ready to Post.')
    }
  } else {
    warnings.push('Status is not a select property.')
  }

  if (!props['Caption Draft']) {
    warnings.push('Caption Draft is missing. Add a text property named Caption Draft.')
  }

  return { patch, warnings }
}

export function statusQueryFilter(statusProperty) {
  const type = statusProperty?.type === 'status' ? 'status' : 'select'
  return {
    or: REVIEW_STATUSES.map(name => ({ property: 'Status', [type]: { equals: name } })),
  }
}

export function toSocialPost(page) {
  const props = page?.properties || {}
  const titleProp = props['Post Title'] || Object.values(props).find(prop => prop?.type === 'title')
  const approvedBy = orderedApprovers(labelsFromProperty(props['Approved By']))
  return {
    id: page?.id,
    title: textFromProperty(titleProp) || 'Untitled',
    status: labelsFromProperty(props.Status)[0] || null,
    platform: labelsFromProperty(props.Platform),
    clipType: labelsFromProperty(props['Clip Type'])[0] || null,
    publishDate: dateFromProperty(props['Publish Date']),
    driveLink: urlFromProperty(props['Drive Link']),
    canvaLink: urlFromProperty(props['Canva Link']),
    caption: textFromProperty(props['Caption Draft']),
    revisionNotes: textFromProperty(props['Revision Notes']),
    episode: textFromProperty(props.Episode),
    notes: textFromProperty(props.Notes),
    assignedTo: textFromProperty(props['Assigned To']),
    approvedBy,
    approvalCount: approvedBy.length,
  }
}

export function compareSocialPosts(a, b) {
  const rank = { 'In Review': 0, 'In Edit': 1, 'Ready to Post': 2 }
  const ra = Object.prototype.hasOwnProperty.call(rank, a?.status) ? rank[a.status] : 9
  const rb = Object.prototype.hasOwnProperty.call(rank, b?.status) ? rank[b.status] : 9
  if (ra !== rb) return ra - rb
  const da = a?.publishDate || '9999-99-99'
  const db = b?.publishDate || '9999-99-99'
  if (da !== db) return da < db ? -1 : 1
  return String(a?.title || '').localeCompare(String(b?.title || ''))
}

export function sortSocialPosts(items) {
  return [...(items || [])].sort(compareSocialPosts)
}

export function filterSocialPosts(items, filter) {
  const list = items || []
  if (!filter || filter === 'All') return list.filter(item => REVIEW_STATUSES.includes(item.status))
  return list.filter(item => item.status === filter)
}

export function richTextChunks(text) {
  const value = text == null ? '' : String(text)
  if (!value) return []
  const chunks = []
  for (let i = 0; i < value.length; i += 2000) {
    chunks.push({ type: 'text', text: { content: value.slice(i, i + 2000) } })
  }
  return chunks
}

export function textPropertyUpdate(prop, text) {
  const chunks = richTextChunks(text)
  if (prop?.type === 'title') return { title: chunks }
  return { rich_text: chunks }
}

export function statusPropertyUpdate(prop, name) {
  if (!WRITABLE_STATUSES.includes(name)) {
    throw new Error('Status cannot be set to that value here')
  }
  if (prop?.type === 'status') return { status: { name } }
  return { select: { name } }
}

export function approvedByPropertyUpdate(prop, names) {
  const list = Array.isArray(names) ? names : []
  if (prop?.type === 'rich_text' || prop?.type === 'title') {
    return textPropertyUpdate(prop, list.join(', '))
  }
  return { multi_select: list.map(name => ({ name })) }
}

export function notionPropertyWrites(pageProperties, planned) {
  const props = pageProperties || {}
  const writes = {}
  if (!planned || typeof planned !== 'object') return writes
  if (Object.prototype.hasOwnProperty.call(planned, 'Status')) {
    writes.Status = statusPropertyUpdate(props.Status, planned.Status)
  }
  if (Object.prototype.hasOwnProperty.call(planned, 'Approved By')) {
    writes['Approved By'] = approvedByPropertyUpdate(props['Approved By'], planned['Approved By'])
  }
  if (Object.prototype.hasOwnProperty.call(planned, 'Caption Draft')) {
    writes['Caption Draft'] = textPropertyUpdate(props['Caption Draft'], planned['Caption Draft'])
  }
  if (Object.prototype.hasOwnProperty.call(planned, 'Revision Notes')) {
    writes['Revision Notes'] = textPropertyUpdate(props['Revision Notes'], planned['Revision Notes'])
  }
  return writes
}

function snapshot(item, patch) {
  const approvedBy = Object.prototype.hasOwnProperty.call(patch, 'approvedBy')
    ? patch.approvedBy
    : orderedApprovers(item.approvedBy || [])
  return {
    status: Object.prototype.hasOwnProperty.call(patch, 'status') ? patch.status : (item.status || null),
    approvedBy,
    approvalCount: approvedBy.length,
    caption: Object.prototype.hasOwnProperty.call(patch, 'caption') ? patch.caption : (item.caption || ''),
    revisionNotes: Object.prototype.hasOwnProperty.call(patch, 'revisionNotes') ? patch.revisionNotes : (item.revisionNotes || ''),
  }
}

export function planReviewAction({
  action,
  author,
  roles = [],
  comment,
  caption,
  item = {},
} = {}) {
  const name = typeof author === 'string' ? author.trim() : ''
  const status = item.status || ''
  const approvedBy = orderedApprovers(item.approvedBy || [])
  const caps = capabilitiesFor(name, roles)
  const current = snapshot(item, { approvedBy })

  if (!name) return { ok: false, statusCode: 400, error: "Pick who's here before reviewing." }
  if (!REVIEW_STATUSES.includes(status)) {
    return { ok: false, statusCode: 409, error: 'This post is not in the review queue.' }
  }

  if (action === 'approve') {
    if (!caps.canApprove) {
      return { ok: false, statusCode: 403, error: 'Only Sam, Logan, Jurahee, Conner, and Jenny Bett can approve.' }
    }
    if (status !== 'In Review') {
      return { ok: false, statusCode: 409, error: 'Send this to In Review before approving.' }
    }
    if (approvedBy.includes(caps.reviewer)) {
      return { ok: true, noop: true, item: current }
    }
    const nextApproved = orderedApprovers([...approvedBy, caps.reviewer])
    const ready = nextApproved.length >= APPROVALS_NEEDED
    const nextStatus = ready ? 'Ready to Post' : status
    return {
      ok: true,
      properties: {
        'Approved By': nextApproved,
        ...(ready ? { Status: nextStatus } : {}),
      },
      mentionKaty: ready,
      comment: ready ? reviewCommentBody('approve', { approvedBy: nextApproved }) : null,
      item: snapshot(item, { status: nextStatus, approvedBy: nextApproved }),
    }
  }

  if (action === 'request-edits') {
    if (!caps.canRequestEdits) {
      return { ok: false, statusCode: 403, error: 'Ask for edits is for reviewers, Katy, or a Producer.' }
    }
    const note = typeof comment === 'string' ? comment.trim() : ''
    if (!note) return { ok: false, statusCode: 400, error: 'Add a note about what to change.' }
    return {
      ok: true,
      properties: {
        Status: 'In Edit',
        'Approved By': [],
        'Revision Notes': note,
      },
      comment: reviewCommentBody('request-edits', { comment: note }),
      item: snapshot(item, { status: 'In Edit', approvedBy: [], revisionNotes: note }),
    }
  }

  if (action === 'save-caption') {
    if (!caps.canEditCaption) {
      return { ok: false, statusCode: 403, error: 'Only reviewers, Katy, or a Producer can edit the caption.' }
    }
    if (typeof caption !== 'string') return { ok: false, statusCode: 400, error: 'Caption is required.' }
    const next = caption.trim()
    const prev = String(item.caption || '').trim()
    if (next === prev) return { ok: true, noop: true, item: current }
    return {
      ok: true,
      properties: {
        'Caption Draft': next,
        Status: 'In Edit',
        'Approved By': [],
      },
      item: snapshot(item, { status: 'In Edit', approvedBy: [], caption: next }),
    }
  }

  if (action === 'send-to-review') {
    if (!caps.canSendToReview) {
      return { ok: false, statusCode: 403, error: 'Only Katy or a Producer can send a post to In Review.' }
    }
    if (status !== 'In Edit') {
      return { ok: false, statusCode: 409, error: 'Only posts in edit can be sent to In Review.' }
    }
    return {
      ok: true,
      properties: { Status: 'In Review' },
      item: snapshot(item, { status: 'In Review', approvedBy }),
    }
  }

  if (action === 'override') {
    if (!caps.canOverride) {
      return { ok: false, statusCode: 403, error: 'Only Katy can override the review gate.' }
    }
    if (status === 'Ready to Post') return { ok: true, noop: true, item: current }
    return {
      ok: true,
      properties: { Status: 'Ready to Post' },
      mentionKaty: true,
      comment: reviewCommentBody('override'),
      item: snapshot(item, { status: 'Ready to Post', approvedBy }),
    }
  }

  return { ok: false, statusCode: 400, error: 'Unknown action' }
}

export function isSocialCalendarUnavailable(err) {
  const code = err?.code || err?.body?.code || ''
  if (code === 'object_not_found' || code === 'unauthorized' || code === 'restricted_resource') return true
  const status = err?.status || err?.statusCode
  if (status === 401 || status === 403 || status === 404) return true
  const message = String(err?.message || '')
  return /could not find database|shared with your integration|unauthorized|not shared/i.test(message)
}

export function socialReadError(err) {
  if (isSocialCalendarUnavailable(err)) {
    return { status: 503, error: SOCIAL_CALENDAR_CONNECT_HINT, connected: false }
  }
  return { status: 500, error: err?.message || 'Could not load the Social Calendar', connected: true }
}
