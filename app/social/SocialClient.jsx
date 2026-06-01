'use client'
import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/app/context/UserContext'

const STATUS_COLORS = {
  'Drafting':         'bg-yellow-100 text-yellow-800',
  'Internal Review':  'bg-gray-100 text-gray-600',
  'Approved':         'bg-green-100 text-green-700',
  'Scheduled':        'bg-blue-100 text-blue-700',
  'Live':             'bg-emerald-100 text-emerald-700',
}

const TYPE_EMOJI = {
  'Show Clip':             '🎙️',
  'Educational Graphic':   '📚',
  'Reel':                  '🎬',
  'Quote / Motivational':  '💬',
  'Product Demo':          '🛒',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDay(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').getDate()
}

function formatMonth(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })
}

// ── Comment thread ────────────────────────────────────────────────
function CommentThread({ pageId, author }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState(null)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/notion/social-comment?pageId=${pageId}`)
      const data = await res.json()
      setComments(data.comments ?? [])
    } catch {
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  function handleToggle() {
    if (!open && comments === null) load()
    setOpen(v => !v)
  }

  async function handleSend() {
    if (!text.trim()) return
    setSending(true)
    try {
      await fetch('/api/notion/social-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, author, text: text.trim() }),
      })
      setText('')
      // Reload comments to show the new one
      await load()
    } catch {
      // non-fatal
    } finally {
      setSending(false)
    }
  }

  const count = comments?.length ?? null

  return (
    <div className="border-t border-gray-100 mt-1">
      <button
        onClick={handleToggle}
        className="w-full px-0 py-2.5 flex items-center gap-1.5 text-xs text-gray-400 font-medium"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h2v2.5L7.5 12H14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z"
            stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <span>
          {count === null
            ? 'Questions or suggestions?'
            : count === 0
            ? 'Questions or suggestions?'
            : `${count} comment${count !== 1 ? 's' : ''}`}
        </span>
        <svg className={`w-3 h-3 ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="pb-3 space-y-2">
          {loading && <p className="text-xs text-gray-400 py-1">Loading…</p>}

          {!loading && comments?.map(c => {
            const lines = c.text.split('\n\n')
            const header = lines[0] ?? ''
            const body = lines.slice(1).join('\n\n')
            return (
              <div key={c.id} className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">{header}</p>
                <p className="text-sm text-gray-700 leading-snug">{body || c.text}</p>
              </div>
            )
          })}

          {!loading && comments?.length === 0 && (
            <p className="text-xs text-gray-400">No comments yet — be the first!</p>
          )}

          {/* Input */}
          <div className="flex gap-2 mt-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Leave a note…"
              className="flex-1 text-sm border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-dl-red"
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="bg-dl-red text-white text-xs font-bold px-4 rounded-xl disabled:opacity-40 active:scale-95 transition-transform"
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Single post card ──────────────────────────────────────────────
function PostCard({ item, user }) {
  const [open, setOpen] = useState(false)
  const statusStyle = STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-600'
  const typeEmoji = TYPE_EMOJI[item.contentType] ?? '📄'

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 py-4 text-left"
      >
        {/* Date column */}
        <div className="text-center w-10 flex-shrink-0">
          <span className="text-xs font-bold text-gray-400 uppercase block leading-none">
            {formatMonth(item.publishDate)}
          </span>
          <span className="text-xl font-bold text-gray-900 leading-none">
            {formatDay(item.publishDate)}
          </span>
        </div>

        {/* Title + badges */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
            {typeEmoji} {item.title}
          </p>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {item.platform?.map(p => (
              <span key={p} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                {p}
              </span>
            ))}
            <span className={`${statusStyle} text-xs px-2 py-0.5 rounded-full font-medium`}>
              {item.status}
            </span>
          </div>
        </div>

        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="pb-2 pl-[52px] pr-1 space-y-2">
          {item.contentType && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Type:</span> {item.contentType}
            </p>
          )}
          {item.format && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Format:</span> {item.format}
            </p>
          )}
          {item.caption && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Caption:</span> {item.caption}
            </p>
          )}
          {item.driveLink && (
            <a
              href={item.driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-bold text-dl-red underline"
            >
              View asset →
            </a>
          )}
          <CommentThread pageId={item.id} author={user} />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function SocialClient() {
  const { user } = useUser()
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/social')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setItems(data.items ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <main className="pb-20 min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 pt-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Social 📱</h1>
          <button
            onClick={load}
            disabled={loading}
            className="bg-black text-white text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>

        {loading && (
          <div className="bg-white rounded-3xl shadow-sm px-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 py-4 border-b border-gray-100 animate-pulse">
                <div className="w-10 space-y-1">
                  <div className="h-3 bg-gray-100 rounded w-8 mx-auto" />
                  <div className="h-6 bg-gray-100 rounded w-8 mx-auto" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border-2 border-dl-red rounded-xl p-5 text-center">
            <p className="text-dl-red font-bold mb-1">Couldn't load posts</p>
            <p className="text-sm text-gray-600">{error}</p>
            <p className="text-xs text-gray-400 mt-2">Make sure NOTION_CONTENT_DB_ID is set in your .env.local</p>
          </div>
        )}

        {!loading && !error && items?.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <div className="text-3xl mb-2">📱</div>
            <p className="font-bold text-gray-700 mb-1">No posts yet</p>
            <p className="text-xs text-gray-400">Add posts to your Notion content calendar with Clients = Drench Line</p>
          </div>
        )}

        {!loading && !error && items?.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm px-4">
            {items.map(item => (
              <PostCard key={item.id} item={item} user={user} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
