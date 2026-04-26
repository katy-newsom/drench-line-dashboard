'use client'
import { useState } from 'react'
import { ModalShell } from './IdeaModal'

const CATEGORIES = ['Travel', 'Equipment', 'Contractor', 'Food', 'Marketing', 'Other']

export default function ExpenseModal({ user, onClose }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Other')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!description.trim() || !amount) return
    setLoading(true)
    try {
      await fetch('/api/notion/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), amount: parseFloat(amount), category, date, submittedBy: user }),
      })
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="💸 Log Expense" onClose={onClose} success={success}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Description *</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
            placeholder="What was the expense?"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Amount *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-600">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className="w-full border-2 border-black rounded-lg pl-7 pr-3 py-2 text-base focus:outline-none focus:border-dl-red"
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red bg-white"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-base focus:outline-none focus:border-dl-red"
          />
        </div>
        <div className="text-xs text-gray-500">Submitted by: <strong>{user || 'Unknown'}</strong></div>
        <button
          type="submit"
          disabled={loading || !description.trim() || !amount}
          className="w-full bg-dl-red text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? 'Logging...' : 'Log Expense'}
        </button>
      </form>
    </ModalShell>
  )
}
