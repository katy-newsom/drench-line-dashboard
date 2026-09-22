'use client'
import { useState } from 'react'

// Shared team comment thread backed by native Notion page comments.
// Used on Social, Episodes, and Ideas. Leads has its own TeamDiscussion
// (voting + comments) and Submissions has an always-open variant.
export default function CommentThread({ pageId, author }) {
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
                <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap">{body || c.text}</p>
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
