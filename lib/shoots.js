export const EDITABLE_STATUSES = ['Idea', 'Planned', 'Shot', 'Edited']
export const FAMILY_FILTERS = ['All', 'Silvers', 'Newsom']

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 }
const EMPTY_DATE = '9999-99-99'

export function normalizeId(id) {
  return String(id || '').replace(/-/g, '').toLowerCase()
}

function joinedPlain(parts) {
  return (parts || []).map(part => part?.plain_text || '').join('').trim()
}

export function textFromProperty(prop) {
  if (!prop || typeof prop !== 'object') return ''
  if (prop.type === 'rich_text') return joinedPlain(prop.rich_text)
  if (prop.type === 'title') return joinedPlain(prop.title)
  if (prop.type === 'select') return prop.select?.name || ''
  if (prop.type === 'multi_select') {
    return (prop.multi_select || []).map(option => option?.name).filter(Boolean).join(', ')
  }
  if (prop.type === 'status') return prop.status?.name || ''
  if (prop.type === 'url') return prop.url || ''
  if (prop.type === 'email') return prop.email || ''
  if (prop.type === 'phone_number') return prop.phone_number || ''
  if (prop.type === 'number') return prop.number == null ? '' : String(prop.number)
  if (prop.type === 'checkbox') return prop.checkbox ? 'Yes' : ''
  if (prop.type === 'date') return prop.date?.start ? String(prop.date.start).slice(0, 10) : ''
  if (prop.type === 'formula') {
    const formula = prop.formula
    if (!formula) return ''
    if (formula.type === 'string') return formula.string || ''
    if (formula.type === 'number') return formula.number == null ? '' : String(formula.number)
    if (formula.type === 'boolean') return formula.boolean ? 'Yes' : ''
    if (formula.type === 'date') return formula.date?.start ? String(formula.date.start).slice(0, 10) : ''
  }
  return ''
}

// Select, multi-select, status, or a comma-separated text stand-in.
export function labelsFromProperty(prop) {
  if (!prop || typeof prop !== 'object') return []
  if (prop.type === 'multi_select') {
    return (prop.multi_select || []).map(option => option?.name).filter(Boolean)
  }
  if (prop.type === 'select') return prop.select?.name ? [prop.select.name] : []
  if (prop.type === 'status') return prop.status?.name ? [prop.status.name] : []
  const text = textFromProperty(prop)
  if (!text) return []
  return text.split(',').map(part => part.trim()).filter(Boolean)
}

export function dateFromProperty(prop) {
  if (!prop || typeof prop !== 'object') return null
  if (prop.type === 'date') {
    return prop.date?.start ? String(prop.date.start).slice(0, 10) : null
  }
  if (prop.type === 'formula' && prop.formula?.type === 'date') {
    return prop.formula.date?.start ? String(prop.formula.date.start).slice(0, 10) : null
  }
  const match = textFromProperty(prop).match(/\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

export function urlFromProperty(prop) {
  if (!prop || typeof prop !== 'object') return null
  if (prop.type === 'url') return prop.url || null
  const href = prop.rich_text?.[0]?.href || prop.title?.[0]?.href
  if (href) return href
  const text = textFromProperty(prop)
  return text || null
}

export function safeHttpUrl(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
  } catch {
    return null
  }
  return null
}

export function toShoot(page) {
  const props = page?.properties || {}
  const ideaProp = props.Idea || Object.values(props).find(prop => prop?.type === 'title')
  return {
    id: page.id,
    idea: textFromProperty(ideaProp) || 'Untitled',
    status: labelsFromProperty(props.Status)[0] || null,
    family: labelsFromProperty(props.Family),
    species: labelsFromProperty(props.Species),
    format: labelsFromProperty(props.Format)[0] || null,
    maslow: labelsFromProperty(props['Maslow Layer'])[0] || null,
    hook: textFromProperty(props.Hook),
    shotNotes: textFromProperty(props['Shot Notes']),
    gear: textFromProperty(props.Gear),
    targetDate: dateFromProperty(props['Target Shoot Date']),
    postedLink: urlFromProperty(props['Posted Link']),
    priority: labelsFromProperty(props.Priority)[0] || null,
  }
}

export function matchesFamily(family, filter) {
  if (!filter || filter === 'All') return true
  const names = (Array.isArray(family) ? family : String(family || '').split(','))
    .map(name => String(name).trim().toLowerCase())
    .filter(Boolean)
  if (names.includes(String(filter).trim().toLowerCase())) return true
  return names.includes('either')
}

export function isPosted(status) {
  return String(status || '').trim().toLowerCase() === 'posted'
}

export function filterShoots(items, { family = 'All', hidePosted = true } = {}) {
  return (items || []).filter(item => {
    if (hidePosted && isPosted(item.status)) return false
    return matchesFamily(item.family, family)
  })
}

function dateKey(value) {
  if (!value) return EMPTY_DATE
  const day = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : EMPTY_DATE
}

export function compareShoots(a, b) {
  const pa = Object.prototype.hasOwnProperty.call(PRIORITY_RANK, a?.priority) ? PRIORITY_RANK[a.priority] : 99
  const pb = Object.prototype.hasOwnProperty.call(PRIORITY_RANK, b?.priority) ? PRIORITY_RANK[b.priority] : 99
  if (pa !== pb) return pa - pb
  const da = dateKey(a?.targetDate)
  const db = dateKey(b?.targetDate)
  if (da !== db) return da < db ? -1 : 1
  return String(a?.idea || '').localeCompare(String(b?.idea || ''))
}

export function sortShoots(items) {
  return [...(items || [])].sort(compareShoots)
}

function isPostedLinkKey(key) {
  return String(key || '').toLowerCase().replace(/[\s_-]/g, '') === 'postedlink'
}

export function shootPatchError(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Invalid request'
  if (!body.id || typeof body.id !== 'string') return 'id required'
  if (Object.keys(body).some(isPostedLinkKey)) return 'Posted Link cannot be edited here'

  const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status')
  const hasDate = Object.prototype.hasOwnProperty.call(body, 'targetDate')
  if (!hasStatus && !hasDate) return 'Nothing to update'

  if (hasStatus) {
    if (typeof body.status !== 'string' || isPosted(body.status)) {
      return 'Status cannot be set to Posted'
    }
    if (!EDITABLE_STATUSES.includes(body.status)) {
      return 'Status must be Idea, Planned, Shot, or Edited'
    }
  }

  if (hasDate && body.targetDate != null && body.targetDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(body.targetDate)) {
    return 'Target Shoot Date must be YYYY-MM-DD'
  }

  return null
}

export function statusUpdate(prop, name) {
  if (prop?.type === 'multi_select') return { multi_select: [{ name }] }
  if (prop?.type === 'status') return { status: { name } }
  if (prop?.type === 'rich_text') return { rich_text: [{ type: 'text', text: { content: name } }] }
  if (prop?.type === 'title') return { title: [{ type: 'text', text: { content: name } }] }
  return { select: { name } }
}

export function dateUpdate(prop, iso) {
  if (prop?.type === 'rich_text') {
    return { rich_text: iso ? [{ type: 'text', text: { content: iso } }] : [] }
  }
  if (prop?.type === 'title') {
    return { title: iso ? [{ type: 'text', text: { content: iso } }] : [] }
  }
  return { date: iso ? { start: iso } : null }
}

export function pageInDatabase(page, databaseId) {
  const parent = page?.parent || {}
  const parentId = parent.database_id || parent.data_source_id || ''
  if (!parentId || !databaseId) return false
  return normalizeId(parentId) === normalizeId(databaseId)
}

export function isShootListUnavailable(err) {
  const code = err?.code || err?.body?.code || ''
  if (code === 'object_not_found' || code === 'unauthorized' || code === 'restricted_resource') return true
  const status = err?.status || err?.statusCode
  if (status === 401 || status === 403 || status === 404) return true
  const message = String(err?.message || '')
  return /could not find database|shared with your integration|unauthorized/i.test(message)
}
