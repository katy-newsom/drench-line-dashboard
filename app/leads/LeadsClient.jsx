'use client'
import { useState, useEffect, useCallback } from 'react'

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function EmailCard({ email }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <button
      className="w-full text-left bg-white border-2 border-black rounded-xl p-4 active:scale-95 transition-transform hover:border-dl-red"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-bold text-sm leading-tight flex-1">{email.subject || '(No subject)'}</span>
        <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(email.date)}</span>
      </div>
      <div className="text-xs text-gray-500 mb-1">{email.from}</div>
      {expanded && email.snippet && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 whitespace-pre-wrap text-left">
          {email.snippet}
        </div>
      )}
    </button>
  )
}

export default function LeadsClient() {
  const [activeTab, setActiveTab] = useState('sponsors')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gmail/leads')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sponsors = data?.sponsors ?? []
  const listeners = data?.listeners ?? []
  const list = activeTab === 'sponsors' ? sponsors : listeners

  return (
    <main className="pb-20 min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 pt-12">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Leads ✉️</h1>
          <button
            onClick={load}
            disabled={loading}
            className="bg-black text-white text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-5">
          {[
            { key: 'sponsors', label: `Sponsors (${sponsors.length})` },
            { key: 'listeners', label: `Listener Q's (${listeners.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                activeTab === tab.key
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center h-48 text-gray-400">Fetching emails...</div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border-2 border-dl-red rounded-xl p-5 text-center">
            <div className="text-dl-red font-bold mb-1">Unable to load</div>
            <div className="text-sm text-gray-600">
              {error.includes('credentials') || error.includes('Gmail')
                ? 'Check Gmail connection — ensure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are set.'
                : error}
            </div>
          </div>
        )}

        {!loading && !error && list.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <div className="text-2xl mb-2">{activeTab === 'sponsors' ? '📬' : '💬'}</div>
            <div className="font-bold text-gray-700 mb-1">
              No {activeTab === 'sponsors' ? 'sponsor' : 'listener'} emails yet
            </div>
            <div className="text-xs text-gray-400">
              {activeTab === 'sponsors' ? 'Sponsor inquiries from Gmail will show here' : 'Listener questions from Gmail will show here'}
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {list.map(email => (
              <EmailCard key={email.id} email={email} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
