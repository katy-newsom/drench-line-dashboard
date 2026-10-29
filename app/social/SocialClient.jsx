'use client'
import { useCallback, useEffect, useState } from 'react'
import { useUser } from '@/app/context/UserContext'
import CommentThread from '@/app/components/drench/CommentThread'
import { safeHttpUrl } from '@/lib/shoots'
import {
  APPROVALS_NEEDED,
  GATE_LABEL,
  REVIEWERS,
  approvalCounter,
  approveHelp,
  capabilitiesFor,
  filterSocialPosts,
} from '@/lib/social'

const FILTERS = [
  { id: 'In Review', label: 'In review' },
  { id: 'In Edit', label: 'In edit' },
  { id: 'Ready to Post', label: 'Ready' },
  { id: 'All', label: 'All' },
]

function formatDay(dateStr) {
  if (!dateStr) return '—'
  return new Date(`${dateStr.slice(0, 10)}T12:00:00`).getDate()
}

function formatMonth(dateStr) {
  if (!dateStr) return ''
  return new Date(`${dateStr.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short' })
}

function LinkOut({ href, label }) {
  const safe = safeHttpUrl(href)
  if (!href) return null
  if (!safe) return <span className="text-sm text-ink-2">{label}</span>
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent underline underline-offset-2">
      {label}
    </a>
  )
}

function PostCard({ item, reviewers, caps, user, busy, error, commentTick, onAction, onPickUser }) {
  const [open, setOpen] = useState(item.status === 'In Review')
  const [caption, setCaption] = useState(item.caption || '')
  const [note, setNote] = useState('')
  const [confirmOverride, setConfirmOverride] = useState(false)
  const approved = new Set(item.approvedBy || [])
  const already = Boolean(caps.reviewer && approved.has(caps.reviewer))
  const help = caps.canApprove ? approveHelp(caps, item.status, already) : null
  const meta = [...(item.platform || []), item.clipType, item.status].filter(Boolean)

  useEffect(() => {
    setCaption(item.caption || '')
  }, [item.caption, item.id])

  async function run(payload) {
    const ok = await onAction(item.id, payload)
    if (ok && payload.action === 'request-edits') setNote('')
    if (ok && payload.action === 'override') setConfirmOverride(false)
  }

  return (
    <article className="bg-card border border-line rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="w-full text-left px-4 py-3.5"
      >
        <div className="flex items-start gap-3">
          <div className="text-center w-10 flex-shrink-0">
            <span className="text-xs font-semibold text-muted uppercase block leading-none">
              {formatMonth(item.publishDate)}
            </span>
            <span className="text-xl font-semibold text-ink leading-none">
              {formatDay(item.publishDate)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm text-ink leading-snug">{item.title}</h2>
            {meta.length > 0 && <p className="text-xs text-muted mt-1">{meta.join(' · ')}</p>}
            <ul className="flex flex-wrap gap-1.5 mt-2" aria-label="Approvals">
              {reviewers.map(name => {
                const on = approved.has(name)
                return (
                  <li
                    key={name}
                    className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                      on ? 'border-good text-good bg-white' : 'border-line text-muted'
                    }`}
                  >
                    {on ? '✓' : '○'} {name}
                  </li>
                )
              })}
            </ul>
            <p className="text-sm font-semibold text-ink mt-2">
              {approvalCounter(item.approvalCount ?? approved.size, APPROVALS_NEEDED, reviewers.length)}
            </p>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-line pt-3 space-y-3">
          {(item.canvaLink || item.driveLink) && (
            <div className="flex gap-4">
              <LinkOut href={item.canvaLink} label="Canva" />
              <LinkOut href={item.driveLink} label="Drive" />
            </div>
          )}
          {item.episode && <p className="text-sm text-ink-2">Episode: {item.episode}</p>}
          {item.revisionNotes && (
            <div>
              <p className="eyebrow mb-1">Revision notes</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{item.revisionNotes}</p>
            </div>
          )}

          <div>
            <label htmlFor={`caption-${item.id}`} className="eyebrow block mb-1">Caption draft</label>
            {caps.canEditCaption ? (
              <>
                <textarea
                  id={`caption-${item.id}`}
                  value={caption}
                  onChange={event => setCaption(event.target.value)}
                  disabled={busy}
                  rows={5}
                  className="field min-h-[120px]"
                />
                <button
                  type="button"
                  onClick={() => run({ action: 'save-caption', caption })}
                  disabled={busy || caption.trim() === (item.caption || '').trim()}
                  className="mt-2 text-sm font-semibold bg-ink text-white px-4 py-2.5 rounded-lg disabled:opacity-40"
                >
                  {(item.approvedBy || []).length ? 'Save caption and clear approvals' : 'Save caption'}
                </button>
                {(item.approvedBy || []).length > 0 && (
                  <p className="text-xs text-muted mt-1">Saving moves this back to In Edit.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink whitespace-pre-wrap">{item.caption || 'No caption yet.'}</p>
            )}
          </div>

          {!user && (
            <button type="button" onClick={onPickUser} className="text-sm font-semibold text-accent underline underline-offset-2">
              Who&apos;s here?
            </button>
          )}

          {caps.canApprove && !already && item.status === 'In Review' && (
            <button
              type="button"
              onClick={() => run({ action: 'approve' })}
              disabled={busy}
              className="text-sm font-semibold bg-ink text-white px-4 py-2.5 rounded-lg disabled:opacity-40"
            >
              👍 Approve as {caps.reviewer}
            </button>
          )}
          {help && <p className="text-xs text-muted">{help}</p>}

          {caps.canSendToReview && item.status === 'In Edit' && (
            <button
              type="button"
              onClick={() => run({ action: 'send-to-review' })}
              disabled={busy}
              className="text-sm font-semibold border border-ink px-4 py-2.5 rounded-lg disabled:opacity-40"
            >
              Send to In Review
            </button>
          )}

          {caps.canOverride && item.status !== 'Ready to Post' && (
            confirmOverride ? (
              <div className="border border-line rounded-lg p-3 space-y-2">
                <p className="text-sm text-ink">Mark Ready to Post without {GATE_LABEL} approvals? This does not publish it.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => run({ action: 'override' })}
                    disabled={busy}
                    className="text-sm font-semibold text-white bg-accent px-3 py-2 rounded-lg disabled:opacity-40"
                  >
                    Override
                  </button>
                  <button type="button" onClick={() => setConfirmOverride(false)} className="text-sm font-semibold text-ink-2 px-3 py-2">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmOverride(true)} className="text-sm font-semibold text-accent">
                Override — Ready to Post
              </button>
            )
          )}

          {caps.canRequestEdits && (
            <form
              onSubmit={event => {
                event.preventDefault()
                run({ action: 'request-edits', comment: note })
              }}
              className="space-y-2"
            >
              <label htmlFor={`edits-${item.id}`} className="eyebrow block">Ask for edits</label>
              <textarea
                id={`edits-${item.id}`}
                value={note}
                onChange={event => setNote(event.target.value)}
                disabled={busy}
                rows={3}
                placeholder="What needs to change?"
                className="field min-h-[88px]"
              />
              <button
                type="submit"
                disabled={busy || !note.trim()}
                className="text-sm font-semibold border border-line-strong px-4 py-2.5 rounded-lg disabled:opacity-40"
              >
                Send back to In Edit
              </button>
            </form>
          )}

          {busy && <p className="text-xs text-muted">Saving</p>}
          {error && <p className="text-sm text-bad">{error}</p>}

          <CommentThread pageId={item.id} author={user} refreshKey={commentTick || 0} />
        </div>
      )}
    </article>
  )
}

export default function SocialClient() {
  const { user, openSelector } = useUser()
  const [items, setItems] = useState(null)
  const [team, setTeam] = useState([])
  const [reviewers, setReviewers] = useState(REVIEWERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(true)
  const [warnings, setWarnings] = useState([])
  const [filter, setFilter] = useState('In Review')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [commentTick, setCommentTick] = useState({})
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/social')
      const data = await res.json()
      if (data.connected === false) {
        setConnected(false)
        setItems([])
        setError(data.error || 'Social Calendar is not connected')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setConnected(true)
      setItems(data.items ?? [])
      setTeam(data.team ?? [])
      setReviewers(data.reviewers?.length ? data.reviewers : REVIEWERS)
      setWarnings(data.schemaWarnings ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const member = team.find(person => person.name === user)
  const caps = capabilitiesFor(user, member?.roles || [])
  const visible = filterSocialPosts(items ?? [], filter)

  async function onAction(id, payload) {
    const previous = (items || []).find(item => item.id === id)
    setBusyId(id)
    setActionError(null)
    try {
      const res = await fetch('/api/notion/social', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, author: user, ...payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save')
      setItems(current => (current || []).map(item => (
        item.id === id ? { ...item, ...data.item } : item
      )))
      if (data.commented) {
        setCommentTick(current => ({ ...current, [id]: (current[id] || 0) + 1 }))
      }
      if (data.warning) setActionError({ id, message: data.warning })
      if (previous && data.item?.status && data.item.status !== previous.status) {
        setNotice(`${previous.title} is now ${data.item.status}.`)
      } else {
        setNotice(null)
      }
      return true
    } catch (err) {
      setActionError({ id, message: err.message || 'Could not save' })
      return false
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="pb-24 min-h-screen">
      <div className="max-w-lg mx-auto px-4 pt-16">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">Content</p>
            <h1 className="font-display text-[2rem] uppercase leading-none">Social</h1>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-sm font-semibold text-ink-2 disabled:opacity-50"
          >
            {loading ? 'Loading' : 'Reload'}
          </button>
        </div>
        <p className="text-sm text-ink-2 mt-2">
          {GATE_LABEL} approvals mark a draft Ready to Post. Nothing posts from here.
        </p>
        <p className="text-sm text-muted mt-1">Reviewers: {reviewers.join(', ')}.</p>
        {notice && <p className="text-sm font-semibold text-ink mt-3">{notice}</p>}

        {warnings.length > 0 && (
          <div className="mt-4 border border-line rounded-xl px-4 py-3">
            {warnings.map(warning => (
              <p key={warning} className="text-sm text-ink-2">{warning}</p>
            ))}
          </div>
        )}

        {!loading && connected && !error && (
          <div className="flex gap-2 mt-5 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
            {FILTERS.map(option => {
              const count = filterSocialPosts(items ?? [], option.id).length
              const selected = filter === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  aria-pressed={selected}
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg border ${
                    selected ? 'bg-ink text-white border-ink' : 'bg-card text-ink-2 border-line'
                  }`}
                >
                  {option.label} {count}
                </button>
              )
            })}
          </div>
        )}

        {loading && (
          <div className="space-y-2 mt-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-line rounded-xl px-4 py-3.5 animate-pulse space-y-2">
                <div className="h-4 bg-line rounded w-2/3" />
                <div className="h-3 bg-line rounded w-5/6" />
                <div className="h-3 bg-line rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="border border-dashed border-line-strong rounded-xl p-10 text-center mt-5">
            <p className="font-semibold text-ink mb-1">Couldn&apos;t load the Social Calendar</p>
            <p className="text-xs text-muted">{error}</p>
          </div>
        )}

        {!loading && !error && connected && visible.length === 0 && (
          <div className="border border-dashed border-line-strong rounded-xl p-10 text-center">
            <p className="font-semibold text-ink mb-1">Nothing in this list</p>
            <p className="text-xs text-muted">
              {filter === 'All'
                ? 'No drafts are in edit, in review, or ready to post.'
                : `No posts are ${filter === 'Ready to Post' ? 'ready to post' : filter.toLowerCase()}.`}
            </p>
          </div>
        )}

        {!loading && !error && connected && visible.length > 0 && (
          <div className="space-y-2">
            {visible.map(item => (
              <PostCard
                key={item.id}
                item={item}
                reviewers={reviewers}
                caps={caps}
                user={user}
                busy={busyId === item.id}
                error={actionError?.id === item.id ? actionError.message : null}
                commentTick={commentTick[item.id] || 0}
                onAction={onAction}
                onPickUser={openSelector}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
