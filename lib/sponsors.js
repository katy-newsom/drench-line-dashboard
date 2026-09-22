// Shared sponsor model + money math. Used by the Sponsors API, the Sponsors
// page, and the Dashboard so every screen shows the same numbers.
//
// Three kinds of deals:
//   Recurring — monthly packages (BASE/CORE/LEAD). Uses Monthly Value + Deal Start/End.
//   One-Time  — Breeder Spotlights, one-off episode sponsorships. Uses One-Time Fee + Episode Date.
//   In-Kind   — trade deals. No cash, just the term dates.

export const DEAL_TYPES = ['Recurring', 'One-Time', 'In-Kind']
const RECURRING_TIERS = ['BASE', 'CORE', 'LEAD']

function getTitle(page) {
  const prop = Object.values(page.properties).find(p => p.type === 'title')
  return prop?.title?.[0]?.plain_text ?? ''
}
function getText(page, name) {
  return page.properties[name]?.rich_text?.map(t => t.plain_text).join('') ?? ''
}
function getSelect(page, name) {
  return page.properties[name]?.select?.name ?? null
}
function getDate(page, name) {
  return page.properties[name]?.date?.start ?? null
}
function getNumber(page, name) {
  return page.properties[name]?.number ?? null
}
function getCheckbox(page, name) {
  return page.properties[name]?.checkbox ?? false
}
function getRelationIds(page, name) {
  return page.properties[name]?.relation?.map(r => r.id) ?? []
}

export function toSponsor(page) {
  return {
    id: page.id,
    companyName: getTitle(page),
    contactName: getText(page, 'Contact Name'),
    status: getSelect(page, 'Status'),
    tier: getSelect(page, 'Tier'),
    dealType: getSelect(page, 'Deal Type'),
    monthlyValue: getNumber(page, 'Monthly Value'),
    oneTimeFee: getNumber(page, 'One-Time Fee'),
    episodeDate: getDate(page, 'Episode Date'),
    lastContactDate: getDate(page, 'Last Contact Date'),
    dealStart: getDate(page, 'Deal Start'),
    dealEnd: getDate(page, 'Deal End'),
    notes: getText(page, 'Notes'),
    flaggedBy: getText(page, 'Flagged By'),
    invoiceStatus: getSelect(page, 'Invoice Status') ?? 'Not Invoiced',
    exclusiveCategory: getCheckbox(page, 'Exclusive Category'),
    archived: getCheckbox(page, 'Archived'),
    packageIds: getRelationIds(page, 'Sponsorship Package'),
    createdTime: page.created_time,
  }
}

// Deal Type is set explicitly in Notion; older rows without it fall back to
// what their Tier / package link implies.
export function dealTypeOf(s) {
  if (DEAL_TYPES.includes(s.dealType)) return s.dealType
  if (RECURRING_TIERS.includes(s.tier)) return 'Recurring'
  if (s.tier === 'In-Kind') return 'In-Kind'
  if ((s.packageIds ?? []).length > 0 || s.oneTimeFee != null) return 'One-Time'
  return 'Recurring'
}

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export function isLive(s) {
  return !s.archived && s.status !== 'Interested (Unconfirmed)'
}

export function isWon(s) {
  return isLive(s) && s.status === 'Closed Won'
}

// Signed recurring deals count toward monthly recurring as soon as they close,
// even before Deal Start, and drop off once Deal End has passed.
export function countsTowardRecurring(s, today = todayISO()) {
  return isWon(s) && dealTypeOf(s) === 'Recurring' && (!s.dealEnd || s.dealEnd >= today)
}

// Which year a one-time deal's money belongs to: its episode date, else when it was logged.
export function oneTimeYear(s) {
  const d = s.episodeDate ?? s.dealStart ?? s.createdTime
  return d ? Number(d.slice(0, 4)) : new Date().getFullYear()
}

// How many months of a recurring deal fall inside the given year. Deals with
// no start date count from when they were logged; no end date runs through Dec.
export function recurringMonthsInYear(s, year) {
  const start = new Date(`${(s.dealStart ?? s.createdTime ?? `${year}-01-01`).slice(0, 10)}T00:00:00Z`)
  const end = s.dealEnd ? new Date(`${s.dealEnd}T00:00:00Z`) : new Date(Date.UTC(year, 11, 31))
  const from = Math.max(start, Date.UTC(year, 0, 1))
  const to = Math.min(end, Date.UTC(year, 11, 31))
  if (to < from) return 0
  const days = (to - from) / 86400000 + 1
  return Math.round(days / (365.25 / 12))
}

export function summarizeSponsors(sponsors) {
  const today = todayISO()
  const year = Number(today.slice(0, 4))
  const summary = {
    year,
    recurringMonthly: 0, recurringCount: 0,
    oneTimeTotal: 0, oneTimeCount: 0, oneTimeMissingFee: 0,
    recurringYearTotal: 0, yearTotal: 0,
    inKindCount: 0,
    activeCount: 0, invoicesPending: 0, pipeline: 0,
  }

  for (const s of sponsors) {
    if (!isLive(s)) continue
    if (s.status === 'Closed Lost') continue
    if (s.status !== 'Closed Won') { summary.pipeline++; continue }

    const type = dealTypeOf(s)
    if (type === 'Recurring') {
      // Year total includes deals that already ended this year — that money was still booked.
      summary.recurringYearTotal += (s.monthlyValue ?? 0) * recurringMonthsInYear(s, year)
      if (!countsTowardRecurring(s, today)) continue
      summary.recurringMonthly += s.monthlyValue ?? 0
      summary.recurringCount++
    } else if (type === 'One-Time') {
      if (oneTimeYear(s) !== year) continue
      summary.oneTimeTotal += s.oneTimeFee ?? 0
      summary.oneTimeCount++
      if (s.oneTimeFee == null) summary.oneTimeMissingFee++
    } else {
      if (s.dealEnd && s.dealEnd < today) continue
      summary.inKindCount++
    }
    summary.activeCount++
    if (type !== 'In-Kind' && (s.invoiceStatus ?? 'Not Invoiced') !== 'Paid') summary.invoicesPending++
  }

  summary.yearTotal = summary.recurringYearTotal + summary.oneTimeTotal
  return summary
}
