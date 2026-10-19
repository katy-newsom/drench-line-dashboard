'use client'
import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../context/UserContext'

const CATEGORIES = ['Equipment', 'Software', 'Marketing', 'Travel', 'Studio', 'Editing', 'Other']

function formatDate(str) {
  if (!str) return ''
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}


function AddDrawer({ onClose, onSaved, defaultSubmitter }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    submittedBy: defaultSubmitter || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to save')
      }
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
          <h2 className="font-display text-2xl uppercase leading-none">Log an expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
              What was it? <span className="text-dl-red">*</span>
            </label>
            <input value={form.description} onChange={e => set('description', e.target.value)} required
              placeholder="e.g. Adobe Subscription, New Mic, Studio Time…"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                Amount <span className="text-dl-red">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">$</span>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} required
                  placeholder="0.00"
                  className="w-full border-2 border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-dl-red" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red bg-white">
                <option value="">— Pick one</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Logged by</label>
              <input value={form.submittedBy} onChange={e => set('submittedBy', e.target.value)}
                placeholder="Your name"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-dl-red" />
            </div>
          </div>
          {error && <p className="text-sm text-dl-red font-medium">{error}</p>}
          <button type="submit" disabled={saving || !form.description.trim() || !form.amount}
            className="w-full bg-black text-white font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-40">
            {saving ? 'Saving to Notion…' : 'Save Expense'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ExpenseRow({ item }) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-line last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-ink leading-snug">{item.description}</p>
        <div className="flex gap-1.5 mt-1 flex-wrap items-center">
          {item.category && (
            <span className="text-xs font-semibold text-ink-2">{item.category}</span>
          )}
          {item.date && <span className="text-xs text-muted">{formatDate(item.date)}</span>}
          {item.submittedBy && <span className="text-xs text-muted">· {item.submittedBy}</span>}
        </div>
      </div>
      <span className="font-semibold text-sm text-ink flex-shrink-0 tabular-nums">{formatCurrency(item.amount)}</span>
    </div>
  )
}

export default function ExpensesClient() {
  const { user } = useUser()
  const [expenses, setExpenses] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/expenses')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setExpenses(data.expenses ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleSaved() {
    setShowAdd(false)
    load()
  }

  const categories = ['All', ...CATEGORIES]
  const filtered = expenses?.filter(e => activeCategory === 'All' || e.category === activeCategory) ?? []
  const total = filtered.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const grandTotal = expenses?.reduce((sum, e) => sum + (e.amount ?? 0), 0) ?? 0

  return (
    <>
      {showAdd && <AddDrawer onClose={() => setShowAdd(false)} onSaved={handleSaved} defaultSubmitter={user} />}

      <main className="pb-24 min-h-screen">
        <div className="max-w-lg mx-auto px-4 pt-16">

          <div className="flex items-end justify-between mb-5 gap-3">
            <div>
              <p className="eyebrow mb-2">Money out</p>
              <h1 className="font-display text-[2rem] uppercase leading-none">Expenses</h1>
              {expenses && (
                <p className="text-sm text-ink-2 mt-2">
                  {formatCurrency(grandTotal)} total · {expenses.length} item{expenses.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button onClick={() => setShowAdd(true)}
              className="bg-ink text-white text-sm font-semibold px-4 py-2 rounded-lg">
              Log
            </button>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCategory(c)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg border ${
                  activeCategory === c ? 'bg-ink text-white border-ink' : 'bg-card text-ink-2 border-line'
                }`}>
                {c}
              </button>
            ))}
          </div>

          {/* Total for current filter */}
          {activeCategory !== 'All' && filtered.length > 0 && (
            <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-4 flex justify-between items-center">
              <span className="text-sm text-gray-500 font-medium">{activeCategory} total</span>
              <span className="font-bold text-base">{formatCurrency(total)}</span>
            </div>
          )}

          {loading && (
            <div className="bg-card border border-line rounded-xl px-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3 py-3.5 border-b border-gray-100 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="w-16 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border-2 border-dl-red rounded-xl p-5 text-center">
              <p className="text-dl-red font-bold mb-1">Couldn't load expenses</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="border border-dashed border-line-strong rounded-xl p-10 text-center">
              <p className="font-semibold text-ink mb-1">
                {activeCategory === 'All' ? 'No expenses logged yet' : `No ${activeCategory} expenses`}
              </p>
              <p className="text-xs text-muted">Tap Log to add one.</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="bg-card border border-line rounded-xl px-4">
              {filtered.map(item => <ExpenseRow key={item.id} item={item} />)}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
