'use client'
import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../context/UserContext'
import { DEAL_TYPES, dealTypeOf, summarizeSponsors } from '@/lib/sponsors'

const PIPELINE_STATUSES = ['Lead', 'Contacted', 'In Talks', 'Closed Won', 'Closed Lost']
const ALL_STATUSES = ['Interested (Unconfirmed)', ...PIPELINE_STATUSES]
const INVOICE_STATUSES = ['Not Invoiced', 'Invoiced', 'Paid']

const TIER_DETAILS = {
  BASE:      { price: '$500/mo',   color: 'bg-blue-100 text-blue-800',   min: '3-month min' },
  CORE:      { price: '$800/mo',   color: 'bg-purple-100 text-purple-800', min: '3-month min' },
  LEAD:      { price: '$1,500/mo', color: 'bg-red-100 text-red-800',     min: '6-month min' },
  'In-Kind': { price: 'Trade',     color: 'bg-green-100 text-green-800', min: 'Flexible' },
  Custom:    { price: 'Custom',    color: 'bg-orange-100 text-orange-800', min: 'Flexible' },
}

const VOTES = [
  { label: 'Back it', value: '✅ Back it' },
  { label: 'Pass', value: '🚫 Pass' },
  { label: 'Maybe', value: '🤔 Maybe' },
]

function formatDate(str) {
  if (!str) return ''
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(n) {
  if (n == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const DEAL_TYPE_HINTS = {
  Recurring:  'Monthly package (BASE / CORE / LEAD) — counts toward monthly recurring.',
  'One-Time': 'Breeder Spotlight or one-off episode — a single fee, no monthly amount or end date.',
  'In-Kind':  'Trade deal — no cash, just track the term.',
}
const RECURRING_TIERS = ['BASE', 'CORE', 'LEAD']

// Anything with a status the app doesn't know (e.g. one typed straight into
// Notion) lands in Lead instead of disappearing from the list.
function statusOf(sponsor) {
  return PIPELINE_STATUSES.includes(sponsor.status) ? sponsor.status : 'Lead'
}

function DealTypePicker({ value, onChange, dark }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {DEAL_TYPES.map(t => (
          <button key={t} type="button" onClick={() => onChange(t)}
            className={`text-xs font-bold py-2 rounded-lg border-2 transition-colors ${
              value === t ? 'border-black bg-black text-white' : `${dark ? 'border-black' : 'border-gray-200'} bg-white text-gray-700`
            }`}>
            {t === 'Recurring' ? 'Monthly' : t === 'One-Time' ? 'One-time' : 'In-kind'}
          </button>
        ))}
      </div>
      {value && <p className="text-xs text-gray-400 mt-1">{DEAL_TYPE_HINTS[value]}</p>}
    </div>
  )
}

function DollarInput({ value, onChange, placeholder, className }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">$</span>
      <input type="number" min="0" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full pl-7 pr-3 text-sm focus:outline-none focus:border-dl-red ${className}`} />
    </div>
  )
}

// One-time deals are tied to Breeder Spotlight / One-Off packages; the monthly
// BASE/CORE/LEAD packages are chosen with Tier instead.
function oneTimePackages(packages) {
  return (packages ?? []).filter(p => !/\b(BASE|CORE|LEAD)\b/.test(p.name))
}

// ── Team Discussion (comments + voting) ──────────────────────────
function TeamDiscussion({ pageId, author }) {
  const [comments, setComments] = useState(null)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [votingFor, setVotingFor] = useState(null)

  useEffect(() => {
    if (!pageId) return
    fetch(`/api/notion/social-comment?pageId=${pageId}`)
      .then(r => r.json())
      .then(d => setComments(d.comments ?? []))
      .catch(() => setComments([]))
  }, [pageId])

  async function post(content) {
    setPosting(true)
    try {
      await fetch('/api/notion/social-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, author: author || 'Team', text: content }),
      })
      const res = await fetch(`/api/notion/social-comment?pageId=${pageId}`)
      const d = await res.json()
      setComments(d.comments ?? [])
    } catch { } finally { setPosting(false) }
  }

  async function handleVote(vote) {
    setVotingFor(vote)
    await post(vote)
    setVotingFor(null)
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!text.trim()) return
    await post(text.trim())
    setText('')
  }

  // Tally votes from comments
  const tally = { '✅ Back it': 0, '🚫 Pass': 0, '🤔 Maybe': 0 }
  comments?.forEach(c => {
    const v = VOTES.find(v => c.text.includes(v.value))
    if (v) tally[v.value]++
  })
  const totalVotes = Object.values(tally).reduce((a, b) => a + b, 0)

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="eyebrow mb-3">Team vote</p>

      {/* Vote buttons */}
      <div className="flex gap-2 mb-3">
        {VOTES.map(v => (
          <button key={v.value} onClick={() => handleVote(v.value)}
            disabled={posting}
            className={`flex-1 text-xs font-bold py-2 rounded-xl border-2 transition-colors active:scale-95 disabled:opacity-40 ${
              tally[v.value] > 0
                ? 'border-black bg-black text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-black'
            }`}>
            {votingFor === v.value ? '…' : v.label}
            {tally[v.value] > 0 && <span className="ml-1 opacity-70">({tally[v.value]})</span>}
          </button>
        ))}
      </div>

      {/* Vote tally bar */}
      {totalVotes > 0 && (
        <div className="flex gap-1 h-1.5 rounded-full overflow-hidden mb-3">
          {tally['✅ Back it'] > 0 && (
            <div className="bg-green-400 transition-all" style={{ width: `${(tally['✅ Back it'] / totalVotes) * 100}%` }} />
          )}
          {tally['🤔 Maybe'] > 0 && (
            <div className="bg-yellow-400 transition-all" style={{ width: `${(tally['🤔 Maybe'] / totalVotes) * 100}%` }} />
          )}
          {tally['🚫 Pass'] > 0 && (
            <div className="bg-red-400 transition-all" style={{ width: `${(tally['🚫 Pass'] / totalVotes) * 100}%` }} />
          )}
        </div>
      )}

      {/* Comment thread */}
      <p className="eyebrow mb-2">Notes</p>
      {comments === null ? (
        <p className="text-xs text-gray-400 mb-2">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 italic mb-2">No notes yet — add context below</p>
      ) : (
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleComment} className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)}
          placeholder="Add context, history, concerns…"
          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-dl-red" />
        <button type="submit" disabled={posting || !text.trim()}
          className="bg-black text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-40">
          {posting ? '…' : 'Post'}
        </button>
      </form>
    </div>
  )
}

// ── Packages reference card ────────────────────────────────────────
function PackagesCard({ packages }) {
  const [sectionOpen, setSectionOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)
  if (!packages || packages.length === 0) return null

  return (
    <div className="mt-8 border-t border-line pt-4">
      <button onClick={() => setSectionOpen(v => !v)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="text-sm font-semibold">Packages</span>
        <span className="text-xs text-muted ml-2">{packages.length}</span>
        <svg className={`w-4 h-4 text-muted ml-auto flex-shrink-0 transition-transform ${sectionOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {sectionOpen && (
      <div className="space-y-2 mt-3">
        {packages.map(pkg => {
          const open = expanded === pkg.id
          return (
            <div key={pkg.id} className="bg-card border border-line rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(open ? null : pkg.id)}
                className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{pkg.name}</p>
                  {pkg.price && <p className="text-xs text-muted mt-0.5">{pkg.price}</p>}
                </div>
                <svg className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open && pkg.deliverables && (
                <div className="px-3 pb-3 pt-1">
                  <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">{pkg.deliverables}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

// ── Add Sponsor Drawer ────────────────────────────────────────────
function AddDrawer({ onClose, onSaved, defaultUser, existingNames, packages }) {
  const [form, setForm] = useState({
    companyName: '', contactName: '', dealType: '', tier: '', monthlyValue: '',
    oneTimeFee: '', episodeDate: '', packageIds: [],
    notes: '', flaggedBy: defaultUser || '', status: 'Lead',
  })
  const spotlightPackages = oneTimePackages(packages)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const duplicate = form.companyName.trim().length > 2 &&
    existingNames.some(n => n.toLowerCase().includes(form.companyName.trim().toLowerCase()) ||
      form.companyName.trim().toLowerCase().includes(n.toLowerCase()))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.companyName.trim()) return
    setSaving(true)
    setError(null)
    try {
      // Only send the money fields that match the deal type, so a one-off
      // can never end up in the monthly number.
      const body = { ...form }
      if (form.dealType !== 'Recurring') body.monthlyValue = ''
      if (form.dealType !== 'One-Time') { body.oneTimeFee = ''; body.episodeDate = ''; body.packageIds = [] }
      if (form.dealType === 'One-Time' && !body.tier) body.tier = 'Custom'
      if (form.dealType === 'In-Kind') body.tier = 'In-Kind'
      const res = await fetch('/api/notion/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      onSaved()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <div className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-w-lg mx-auto w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl uppercase leading-none">Add sponsor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Company / Brand *</label>
            <input value={form.companyName} onChange={e => set('companyName', e.target.value)} required
              placeholder="e.g. Purina, Tractor Supply Co…"
              className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none ${duplicate ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 focus:border-dl-red'}`} />
            {duplicate && (
              <p className="text-xs text-yellow-700 font-medium mt-1">
                A similar company is already in the pipeline. Check before adding.
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Contact Name</label>
            <input value={form.contactName} onChange={e => set('contactName', e.target.value)}
              placeholder="Who do we talk to?"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red bg-white">
              {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            {form.status === 'Interested (Unconfirmed)' && (
              <p className="text-xs text-gray-400 mt-1">Goes in the Interest List — won't clutter the real pipeline until they reply.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Deal Type</label>
            <DealTypePicker value={form.dealType} onChange={v => set('dealType', v)} />
          </div>
          {form.dealType === 'Recurring' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Tier</label>
                <select value={form.tier} onChange={e => set('tier', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red bg-white">
                  <option value="">— Unknown</option>
                  {RECURRING_TIERS.map(t => <option key={t}>{t}</option>)}
                  <option>Custom</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Per Month</label>
                <DollarInput value={form.monthlyValue} onChange={v => set('monthlyValue', v)} placeholder="800"
                  className="border-2 border-gray-200 rounded-xl py-2.5" />
              </div>
            </div>
          )}
          {form.dealType === 'One-Time' && (
            <>
              {spotlightPackages.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Package</label>
                  <select value={form.packageIds[0] ?? ''} onChange={e => set('packageIds', e.target.value ? [e.target.value] : [])}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red bg-white">
                    <option value="">— Custom one-off</option>
                    {spotlightPackages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Fee (total)</label>
                  <DollarInput value={form.oneTimeFee} onChange={v => set('oneTimeFee', v)} placeholder="1500"
                    className="border-2 border-gray-200 rounded-xl py-2.5" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Episode Date</label>
                  <input type="date" value={form.episodeDate} onChange={e => set('episodeDate', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red" />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Notes / Details</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              placeholder="What they're interested in, timeline, how they found us…"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Logged by</label>
            <input value={form.flaggedBy} onChange={e => set('flaggedBy', e.target.value)}
              placeholder="Your name"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red" />
          </div>
          {error && <p className="text-sm text-dl-red font-medium">{error}</p>}
          <button type="submit" disabled={saving || !form.companyName.trim()}
            className="w-full bg-black text-white font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-40">
            {saving ? 'Saving to Notion…' : 'Save Sponsor'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Edit Sheet ────────────────────────────────────────────────────
function EditSheet({ sponsor, packages, onClose, onSave, author }) {
  const [status, setStatus] = useState(sponsor.status ?? 'Lead')
  const [dealType, setDealType] = useState(dealTypeOf(sponsor))
  const [tier, setTier] = useState(sponsor.tier ?? '')
  const [monthlyValue, setMonthlyValue] = useState(sponsor.monthlyValue ?? '')
  const [oneTimeFee, setOneTimeFee] = useState(sponsor.oneTimeFee ?? '')
  const [episodeDate, setEpisodeDate] = useState(sponsor.episodeDate ?? '')
  const [contactName, setContactName] = useState(sponsor.contactName ?? '')
  const [notes, setNotes] = useState(sponsor.notes ?? '')
  const [dealStart, setDealStart] = useState(sponsor.dealStart ?? '')
  const [dealEnd, setDealEnd] = useState(sponsor.dealEnd ?? '')
  const [invoiceStatus, setInvoiceStatus] = useState(sponsor.invoiceStatus ?? 'Not Invoiced')
  const [exclusiveCategory, setExclusiveCategory] = useState(sponsor.exclusiveCategory ?? false)
  const [archived, setArchived] = useState(sponsor.archived ?? false)
  const [packageIds, setPackageIds] = useState(sponsor.packageIds ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const spotlightPackages = oneTimePackages(packages)
  const spotlightIds = new Set(spotlightPackages.map(p => p.id))

  function togglePackage(id) {
    setPackageIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    // Clear the fields that don't belong to this deal type so the money is
    // only ever counted in one place.
    const isRecurring = dealType === 'Recurring'
    const isOneTime = dealType === 'One-Time'
    const updates = {
      status, dealType,
      tier: dealType === 'In-Kind' ? 'In-Kind' : (tier || null),
      monthlyValue: isRecurring && monthlyValue !== '' ? parseFloat(monthlyValue) : null,
      oneTimeFee: isOneTime && oneTimeFee !== '' ? parseFloat(oneTimeFee) : null,
      episodeDate: isOneTime ? (episodeDate || null) : null,
      dealStart: isOneTime ? null : (dealStart || null),
      dealEnd: isOneTime ? null : (dealEnd || null),
      packageIds: isOneTime ? packageIds : packageIds.filter(id => !spotlightIds.has(id)),
      contactName, notes, invoiceStatus, exclusiveCategory, archived,
    }
    await fetch('/api/notion/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sponsor.id, ...updates }),
    })
    setSaving(false)
    setSaved(true)
    onSave({ ...sponsor, ...updates })
    setTimeout(onClose, 800)
  }

  const tierInfo = TIER_DETAILS[tier]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-xl font-bold">{sponsor.companyName}</h2>
            {tierInfo && <p className="text-xs text-gray-500 mt-0.5">{tierInfo.price} · {tierInfo.min}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">✕</button>
        </div>
        {sponsor.flaggedBy && (
          <p className="text-xs text-gray-400 mb-4">Added by {sponsor.flaggedBy}</p>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red bg-white">
                {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {dealType === 'Recurring' ? (
              <div>
                <label className="block text-sm font-bold mb-1">Tier</label>
                <select value={tier} onChange={e => setTier(e.target.value)}
                  className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red bg-white">
                  <option value="">— Unknown</option>
                  {RECURRING_TIERS.map(t => <option key={t}>{t}</option>)}
                  <option>Custom</option>
                </select>
              </div>
            ) : <div />}
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Deal Type</label>
            <DealTypePicker value={dealType} onChange={setDealType} dark />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Contact Name</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red" />
          </div>

          {dealType === 'Recurring' && (
            <div>
              <label className="block text-sm font-bold mb-1">Per Month ($)</label>
              <DollarInput value={monthlyValue} onChange={setMonthlyValue} placeholder="0"
                className="border-2 border-black rounded-lg py-2" />
            </div>
          )}

          {dealType === 'One-Time' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">Fee (total $)</label>
                <DollarInput value={oneTimeFee} onChange={setOneTimeFee} placeholder="1500"
                  className="border-2 border-black rounded-lg py-2" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Episode Date</label>
                <input type="date" value={episodeDate} onChange={e => setEpisodeDate(e.target.value)}
                  className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red" />
              </div>
            </div>
          )}

          {dealType !== 'One-Time' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">Deal Start</label>
                <input type="date" value={dealStart} onChange={e => setDealStart(e.target.value)}
                  className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Deal End</label>
                <input type="date" value={dealEnd} onChange={e => setDealEnd(e.target.value)}
                  className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red" />
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-bold mb-1">Invoice status</label>
            <select value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value)}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red bg-white">
              {INVOICE_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {dealType === 'One-Time' && spotlightPackages.length > 0 && (
            <div>
              <label className="block text-sm font-bold mb-1">Package</label>
              <div className="space-y-1.5">
                {spotlightPackages.map(pkg => (
                  <label key={pkg.id} className="flex items-center gap-2 text-sm border-2 border-gray-200 rounded-lg px-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={packageIds.includes(pkg.id)} onChange={() => togglePackage(pkg.id)} />
                    <span>{pkg.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input type="checkbox" checked={exclusiveCategory} onChange={e => setExclusiveCategory(e.target.checked)} />
            Wants category exclusivity
          </label>

          <div>
            <label className="block text-sm font-bold mb-1">Notes / Deliverables</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="What's owed? Ad copy, deadlines, special requests…"
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red resize-none" />
          </div>

          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-gray-500 pt-2 border-t border-gray-100">
            <input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />
            Archive this lead
          </label>
        </div>

        <button onClick={save} disabled={saving}
          className={`w-full mt-5 font-bold py-3 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-40 ${saved ? 'bg-green-500 text-white' : 'bg-dl-red text-white'}`}>
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>

        {/* Team Discussion */}
        <TeamDiscussion pageId={sponsor.id} author={author} />
      </div>
    </div>
  )
}

// ── Sponsor card ──────────────────────────────────────────────────
function SponsorCard({ sponsor, packagesById, onTap, showStatus }) {
  const effectiveStatus = statusOf(sponsor)
  const dealType = dealTypeOf(sponsor)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const notStarted = dealType !== 'One-Time' && sponsor.dealStart && sponsor.dealStart > today
  const isActive = effectiveStatus === 'Closed Won'
  const isLost = effectiveStatus === 'Closed Lost'
  const linkedPackages = (sponsor.packageIds ?? []).map(id => packagesById?.[id]?.name).filter(Boolean)
  const unpaid = isActive && dealType !== 'In-Kind' && (sponsor.invoiceStatus ?? 'Not Invoiced') !== 'Paid'

  const meta = [
    dealType === 'Recurring' ? 'Monthly' : dealType === 'One-Time' ? 'One-time' : 'In-kind',
    sponsor.tier,
    ...linkedPackages,
  ].filter(Boolean)

  return (
    <button onClick={() => onTap(sponsor)}
      className={`w-full text-left rounded-xl p-4 border border-line bg-card flex items-center gap-3 ${isLost ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="font-display text-base uppercase leading-tight">{sponsor.companyName}</p>
        <p className="text-sm text-ink-2 mt-1">{meta.join(' · ')}</p>
        {showStatus && (
          <p className="text-xs font-semibold text-muted mt-1">{effectiveStatus}</p>
        )}
        <div className="flex gap-3 mt-1 flex-wrap text-xs text-muted">
          {dealType === 'Recurring' && sponsor.monthlyValue != null && (
            <span>{formatCurrency(sponsor.monthlyValue)}/mo</span>
          )}
          {dealType === 'One-Time' && (
            sponsor.oneTimeFee != null
              ? <span>{formatCurrency(sponsor.oneTimeFee)}</span>
              : isActive && <span className="text-accent font-semibold">Amount needed</span>
          )}
          {sponsor.contactName && <span>{sponsor.contactName}</span>}
        </div>
        {dealType === 'One-Time' && sponsor.episodeDate && (
          <p className="text-xs text-ink-2 mt-1">Episode {formatDate(sponsor.episodeDate)}</p>
        )}
        {isActive && notStarted && <p className="text-xs text-ink-2 mt-1">Starts {formatDate(sponsor.dealStart)}</p>}
        {isActive && dealType !== 'One-Time' && !notStarted && sponsor.dealEnd && (
          <p className="text-xs text-ink-2 mt-1">Through {formatDate(sponsor.dealEnd)}</p>
        )}
        {unpaid && (
          <p className="text-xs font-semibold text-accent mt-1.5">{sponsor.invoiceStatus ?? 'Not Invoiced'}</p>
        )}
        {sponsor.exclusiveCategory && (
          <p className="text-xs text-muted mt-1">Category exclusive</p>
        )}
      </div>
    </button>
  )
}

// ── Collapsible group (Interest List / Archived) ───────────────────
function CollapsibleGroup({ title, sponsors, onTap, hint, onQuickAction, quickActionLabel }) {
  const [open, setOpen] = useState(false)
  if (sponsors.length === 0) return null
  return (
    <div className="mt-6 border-t border-line pt-4">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 mb-1 w-full text-left">
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-xs text-gray-400 font-medium">{sponsors.length}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {hint && <p className="text-xs text-gray-400 mb-3">{hint}</p>}
      {open && (
        <div className="space-y-2 mt-3">
          {sponsors.map(s => (
            <div key={s.id} className="w-full rounded-2xl p-3.5 border-2 border-gray-100 bg-gray-50 flex items-center gap-3">
              <button onClick={() => onTap(s)} className="flex-1 min-w-0 text-left active:scale-[0.98] transition-transform">
                <p className="font-bold text-sm">{s.companyName}</p>
                {s.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.notes}</p>}
              </button>
              {onQuickAction && (
                <button onClick={() => onQuickAction(s)}
                  className="flex-shrink-0 bg-black text-white text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform whitespace-nowrap">
                  {quickActionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function LeadsClient() {
  const { user } = useUser()
  const [sponsors, setSponsors] = useState(null)
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [listView, setListView] = useState('active')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sponsorsRes, packagesRes] = await Promise.all([
        fetch('/api/notion/leads'),
        fetch('/api/notion/packages'),
      ])
      const sponsorsData = await sponsorsRes.json()
      if (!sponsorsRes.ok) throw new Error(sponsorsData.error ?? 'Failed to load')
      setSponsors(sponsorsData.sponsors ?? [])
      if (packagesRes.ok) {
        const packagesData = await packagesRes.json()
        setPackages(packagesData.packages ?? [])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleSaved() { setShowAdd(false); load() }
  function handleSave(updated) {
    setSponsors(prev => prev.map(s => s.id === updated.id ? updated : s))
    setSelected(null)
  }

  async function moveToPipeline(sponsor) {
    setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, status: 'Lead' } : s))
    await fetch('/api/notion/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sponsor.id, status: 'Lead' }),
    })
  }

  const packagesById = Object.fromEntries(packages.map(p => [p.id, p]))

  const live = (sponsors ?? []).filter(s => !s.archived && s.status !== 'Interested (Unconfirmed)')
  const interested = (sponsors ?? []).filter(s => !s.archived && s.status === 'Interested (Unconfirmed)')
  const archived = (sponsors ?? []).filter(s => s.archived)

  function sortSponsors(list) {
    const rank = { Recurring: 0, 'One-Time': 1, 'In-Kind': 2 }
    return [...list].sort((a, b) => {
      const byType = (rank[dealTypeOf(a)] ?? 9) - (rank[dealTypeOf(b)] ?? 9)
      if (byType) return byType
      return (a.companyName || '').localeCompare(b.companyName || '')
    })
  }

  const activeSponsors = sortSponsors(live.filter(s => statusOf(s) === 'Closed Won'))
  const talkingSponsors = sortSponsors(live.filter(s => statusOf(s) !== 'Closed Won'))
  const shownSponsors = listView === 'active' ? activeSponsors : talkingSponsors

  const summary = summarizeSponsors(sponsors ?? [])
  const existingNames = (sponsors ?? []).map(s => s.companyName)

  return (
    <>
      {showAdd && <AddDrawer onClose={() => setShowAdd(false)} onSaved={handleSaved} defaultUser={user} existingNames={existingNames} packages={packages} />}
      {selected && <EditSheet sponsor={selected} packages={packages} onClose={() => setSelected(null)} onSave={handleSave} author={user} />}

      <main className="pb-24 min-h-screen">
        <div className="max-w-lg mx-auto px-4 pt-16">

          <div className="flex items-end justify-between mb-5 gap-3">
            <div>
              <p className="eyebrow mb-2">Pipeline</p>
              <h1 className="font-display text-[2rem] uppercase leading-none">Sponsors</h1>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="bg-ink text-white text-sm font-semibold px-4 py-2 rounded-lg">
              Add
            </button>
          </div>

          {sponsors && (
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-card border border-line rounded-xl p-3">
                <p className="eyebrow">Monthly</p>
                <p className="font-display text-2xl mt-1">{formatCurrency(summary.recurringMonthly)}</p>
              </div>
              <div className="bg-card border border-line rounded-xl p-3">
                <p className="eyebrow">One-time · {summary.year}</p>
                <p className="font-display text-2xl mt-1">{formatCurrency(summary.oneTimeTotal)}</p>
              </div>
            </div>
          )}
          {summary.invoicesPending > 0 && (
            <p className="text-sm font-semibold text-accent mb-4">
              {summary.invoicesPending} invoice{summary.invoicesPending > 1 ? 's' : ''} not paid
            </p>
          )}

          {loading && (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border-2 border-dl-red rounded-xl p-5 text-center">
              <p className="text-dl-red font-bold mb-1">Couldn't load sponsors</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          )}

          {!loading && !error && sponsors?.length === 0 && (
            <div className="border border-dashed border-line-strong rounded-xl p-10 text-center">
              <p className="font-semibold text-ink mb-1">No sponsors yet</p>
              <p className="text-xs text-muted">Tap Add to log the first one.</p>
            </div>
          )}

          {!loading && !error && sponsors && sponsors.length > 0 && (
            <div>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setListView('active')}
                  className={`text-sm font-semibold px-3 py-2 rounded-lg border ${listView === 'active' ? 'bg-ink text-white border-ink' : 'bg-card text-ink-2 border-line-strong'}`}>
                  Active · {activeSponsors.length}
                </button>
                <button onClick={() => setListView('talks')}
                  className={`text-sm font-semibold px-3 py-2 rounded-lg border ${listView === 'talks' ? 'bg-ink text-white border-ink' : 'bg-card text-ink-2 border-line-strong'}`}>
                  In talks · {talkingSponsors.length}
                </button>
              </div>

              {shownSponsors.length === 0 ? (
                <p className="text-sm text-muted mb-6">Nothing in this list.</p>
              ) : (
                <div className="space-y-2">
                  {shownSponsors.map(s => (
                    <SponsorCard key={s.id} sponsor={s} packagesById={packagesById} onTap={setSelected} showStatus={listView === 'talks'} />
                  ))}
                </div>
              )}

              <PackagesCard packages={packages} />
              <CollapsibleGroup
                title="Interest list" sponsors={interested} onTap={setSelected}
                hint="They've reached out but haven't replied yet. Move them into the pipeline once they do."
                onQuickAction={moveToPipeline} quickActionLabel="To pipeline"
              />
              <CollapsibleGroup title="Archived" sponsors={archived} onTap={setSelected} />
            </div>
          )}

        </div>
      </main>
    </>
  )
}
