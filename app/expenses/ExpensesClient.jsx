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

const CATEGORY_COLORS = {
  Equipment:  'bg-blue-50 text-blue-700',
  Software:   'bg-purple-50 text-purple-700',
  Marketing:  'bg-pink-50 text-pink-700',
  Travel:     'bg-yellow-50 text-yellow-800',
  Studio:     'bg-orange-50 text-orange-700',
  Editing:    'bg-teal-50 text-teal-700',
  Other:      'bg-gray-100 text-gray-600',
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
          <h2 className="text-lg font-bold">Log an Expense 💸</h2>
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
  const catStyle = CATEGORY_COLORS[item.category] ?? 'bg-gray-100 text-gray-600'
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 leading-snug">{item.description}</p>
        <div className="flex gap-1.5 mt-1 flex-wrap items-center">
          {item.category && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catStyle}`}>{item.category}</span>
          )}
          {item.date && <span className="text-xs text-gray-400">{formatDate(item.date)}</span>}
          {item.submittedBy && <span className="text-xs text-gray-400">· {item.submittedBy}</span>}
        </div>
      </div>
      <span className="font-bold text-sm text-gray-900 flex-shrink-0">{formatCurrency(item.amount)}</span>
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

      <main className="pb-20 min-h-screen bg-white">
        <div className="max-w-lg mx-auto px-4 pt-12">

          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold">Expenses 💸</h1>
              {expenses && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatCurrency(grandTotal)} total · {expenses.length} item{expenses.length !== 1 ? 's' : ''}
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
                + Log
              </button>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCategory(c)}
                className={`flex-shrink-0 text-xs font-bold px-3 py-2 rounded-full border-2 transition-colors ${
                  activeCategory === c ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200'
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
            <div className="bg-white rounded-3xl shadow-sm px-4">
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
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <div className="text-3xl mb-2">💸</div>
              <p className="font-bold text-gray-700 mb-1">
                {activeCategory === 'All' ? 'No expenses logged yet' : `No ${activeCategory} expenses`}
              </p>
              <p className="text-xs text-gray-400">Tap "+ Log" to add one</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm px-4">
              {filtered.map(item => <ExpenseRow key={item.id} item={item} />)}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
