'use client'
import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../context/UserContext'

const STATUSES = ['Lead', 'Contacted', 'In Talks', 'Closed Won', 'Closed Lost']
const TIERS = ['BASE', 'CORE', 'LEAD', 'In-Kind', 'Custom']

const TIER_DETAILS = {
  BASE:      { price: '$500/mo',   color: 'bg-blue-100 text-blue-800',   min: '3-month min' },
  CORE:      { price: '$800/mo',   color: 'bg-purple-100 text-purple-800', min: '3-month min' },
  LEAD:      { price: '$1,500/mo', color: 'bg-red-100 text-red-800',     min: '6-month min' },
  'In-Kind': { price: 'Trade',     color: 'bg-green-100 text-green-800', min: 'Flexible' },
  Custom:    { price: 'Custom',    color: 'bg-orange-100 text-orange-800', min: 'Flexible' },
}

const STATUS_COLORS = {
  Lead:          'bg-gray-100 text-gray-600',
  Contacted:     'bg-yellow-100 text-yellow-800',
  'In Talks':    'bg-orange-100 text-orange-800',
  'Closed Won':  'bg-green-100 text-green-800',
  'Closed Lost': 'bg-red-50 text-red-400',
}

const STATUS_EMOJI = {
  Lead: '👀', Contacted: '📨', 'In Talks': '🤝', 'Closed Won': '✅', 'Closed Lost': '❌',
}

const VOTES = [
  { label: '✅ Back it',  value: '✅ Back it'  },
  { label: '🚫 Pass',     value: '🚫 Pass'     },
  { label: '🤔 Maybe',   value: '🤔 Maybe'    },
]

function formatDate(str) {
  if (!str) return ''
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(n) {
  if (n == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
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
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Team Vote 🗳️</p>

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
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Notes & Context 💬</p>
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

// ── Add Sponsor Drawer ────────────────────────────────────────────
function AddDrawer({ onClose, onSaved, defaultUser, existingNames }) {
  const [form, setForm] = useState({
    companyName: '', contactName: '', tier: '', monthlyValue: '',
    notes: '', flaggedBy: defaultUser || '', status: 'Lead',
  })
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
      const res = await fetch('/api/notion/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
          <h2 className="text-lg font-bold">Add Sponsor / Lead 💰</h2>
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
                ⚠️ Heads up — a similar company is already in your pipeline. Check before adding!
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Contact Name</label>
            <input value={form.contactName} onChange={e => set('contactName', e.target.value)}
              placeholder="Who do we talk to?"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red bg-white">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Tier Interest</label>
              <select value={form.tier} onChange={e => set('tier', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red bg-white">
                <option value="">— Unknown</option>
                {TIERS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Monthly Value ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">$</span>
              <input type="number" min="0" value={form.monthlyValue} onChange={e => set('monthlyValue', e.target.value)}
                placeholder="Leave blank for In-Kind"
                className="w-full border-2 border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-dl-red" />
            </div>
          </div>
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
function EditSheet({ sponsor, onClose, onSave, author }) {
  const [status, setStatus] = useState(sponsor.status ?? 'Lead')
  const [tier, setTier] = useState(sponsor.tier ?? '')
  const [monthlyValue, setMonthlyValue] = useState(sponsor.monthlyValue ?? '')
  const [contactName, setContactName] = useState(sponsor.contactName ?? '')
  const [notes, setNotes] = useState(sponsor.notes ?? '')
  const [dealStart, setDealStart] = useState(sponsor.dealStart ?? '')
  const [dealEnd, setDealEnd] = useState(sponsor.dealEnd ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/notion/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sponsor.id, status, tier: tier || null,
        monthlyValue: monthlyValue !== '' ? monthlyValue : null,
        contactName, notes,
        dealStart: dealStart || null, dealEnd: dealEnd || null,
      }),
    })
    setSaving(false)
    setSaved(true)
    onSave({ ...sponsor, status, tier: tier || null, monthlyValue: monthlyValue !== '' ? parseFloat(monthlyValue) : null, contactName, notes, dealStart: dealStart || null, dealEnd: dealEnd || null })
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
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Tier</label>
              <select value={tier} onChange={e => setTier(e.target.value)}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red bg-white">
                <option value="">— Unknown</option>
                {TIERS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Contact Name</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red" />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Monthly Value ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">$</span>
              <input type="number" min="0" value={monthlyValue} onChange={e => setMonthlyValue(e.target.value)}
                placeholder={tier === 'In-Kind' ? 'N/A — in-kind deal' : '0'}
                className="w-full border-2 border-black rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-dl-red" />
            </div>
          </div>

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

          <div>
            <label className="block text-sm font-bold mb-1">Notes / Deliverables</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="What's owed? Ad copy, deadlines, special requests…"
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-dl-red resize-none" />
          </div>
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
function SponsorCard({ sponsor, onTap }) {
  const tierInfo = TIER_DETAILS[sponsor.tier]
  const statusStyle = STATUS_COLORS[effectiveStatus] ?? 'bg-gray-100 text-gray-600'
  const effectiveStatus = sponsor.status ?? 'Lead'
  const isActive = effectiveStatus === 'Closed Won'
  const isLost = effectiveStatus === 'Closed Lost'

  return (
    <button onClick={() => onTap(sponsor)}
      className={`w-full text-left rounded-2xl p-4 border-2 flex items-center gap-3 active:scale-[0.98] transition-transform group ${
        isActive ? 'border-green-300 bg-green-50' : isLost ? 'border-gray-100 opacity-50' : 'border-gray-100 bg-white hover:border-black'
      }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm leading-snug">{sponsor.companyName}</span>
          {isActive && <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">ACTIVE</span>}
        </div>
        <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
            {STATUS_EMOJI[effectiveStatus]} {effectiveStatus}
          </span>
          {sponsor.tier && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tierInfo?.color ?? 'bg-gray-100 text-gray-600'}`}>
              {sponsor.tier}
            </span>
          )}
          {sponsor.monthlyValue != null && (
            <span className="text-xs text-gray-500 font-medium">{formatCurrency(sponsor.monthlyValue)}/mo</span>
          )}
        </div>
        <div className="flex gap-3 mt-1 flex-wrap">
          {sponsor.contactName && <p className="text-xs text-gray-400">👤 {sponsor.contactName}</p>}
          {sponsor.flaggedBy && <p className="text-xs text-gray-400">· via {sponsor.flaggedBy}</p>}
        </div>
        {isActive && sponsor.dealEnd && <p className="text-xs text-green-600 font-medium mt-0.5">Deal ends {formatDate(sponsor.dealEnd)}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1 text-gray-300 group-hover:text-gray-600 transition-colors">
          <span className="text-xs font-bold">View</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}

// ── Status section ────────────────────────────────────────────────
function StatusSection({ status, sponsors, onTap }) {
  const [collapsed, setCollapsed] = useState(status === 'Closed Lost')
  if (sponsors.length === 0) return null
  return (
    <div className="mb-5">
      <button onClick={() => setCollapsed(v => !v)} className="flex items-center gap-2 mb-3 w-full text-left">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
          {STATUS_EMOJI[status]} {status}
        </span>
        <span className="text-xs text-gray-400 font-medium">{sponsors.length}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {sponsors.map(s => <SponsorCard key={s.id} sponsor={s} onTap={onTap} />)}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function LeadsClient() {
  const { user } = useUser()
  const [sponsors, setSponsors] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/leads')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setSponsors(data.sponsors ?? [])
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

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = (sponsors ?? []).filter(sp => (sp.status ?? 'Lead') === s)
    return acc
  }, {})

  const activeSponsors = byStatus['Closed Won'] ?? []
  const totalMRR = activeSponsors.reduce((sum, s) => sum + (s.monthlyValue ?? 0), 0)
  const pipeline = (sponsors ?? []).filter(s => s.status !== 'Closed Lost' && s.status !== 'Closed Won').length
  const existingNames = (sponsors ?? []).map(s => s.companyName)

  return (
    <>
      {showAdd && <AddDrawer onClose={() => setShowAdd(false)} onSaved={handleSaved} defaultUser={user} existingNames={existingNames} />}
      {selected && <EditSheet sponsor={selected} onClose={() => setSelected(null)} onSave={handleSave} author={user} />}

      <main className="pb-20 min-h-screen bg-white">
        <div className="max-w-lg mx-auto px-4 pt-12">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Sponsors 💰</h1>
              {sponsors && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {activeSponsors.length > 0
                    ? `${activeSponsors.length} active · ${formatCurrency(totalMRR)}/mo · ${pipeline} in pipeline`
                    : pipeline > 0 ? `${pipeline} in pipeline — keep pushing!` : 'Start building your pipeline 👇'}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={load} disabled={loading}
                className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-50">
                {loading ? '…' : '↻'}
              </button>
              <button onClick={() => setShowAdd(true)}
                className="bg-black text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-transform">
                + Add
              </button>
            </div>
          </div>

          {/* Tier reference card */}
          <div className="bg-black text-white rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Packages</p>
            <div className="grid grid-cols-3 gap-3">
              {['BASE', 'CORE', 'LEAD'].map(t => (
                <div key={t} className="text-center">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${TIER_DETAILS[t].color}`}>{t}</span>
                  <p className="text-sm font-bold text-white mt-1">{TIER_DETAILS[t].price}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{TIER_DETAILS[t].min}</p>
                </div>
              ))}
            </div>
          </div>

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
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <div className="text-3xl mb-2">💰</div>
              <p className="font-bold text-gray-700 mb-1">No sponsors yet</p>
              <p className="text-xs text-gray-400">Tap "+ Add" to log your first lead</p>
            </div>
          )}

          {!loading && !error && sponsors && sponsors.length > 0 && (
            <div>
              {STATUSES.map(status => (
                <StatusSection key={status} status={status} sponsors={byStatus[status]} onTap={setSelected} />
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
