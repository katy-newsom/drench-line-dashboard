'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EDITABLE_STATUSES, FAMILY_FILTERS, filterShoots, safeHttpUrl, sortShoots } from '@/lib/shoots'

function formatDate(value) {
  if (!value) return ''
  const day = String(value).slice(0, 10)
  const [year, month, date] = day.split('-').map(Number)
  if (!year || !month || !date) return ''
  return new Date(year, month - 1, date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function priorityClass(priority) {
  if (priority === 'High') return 'text-accent'
  if (priority === 'Low') return 'text-muted'
  return 'text-ink-2'
}

function ShootCard({ item, saving, error, onSave }) {
  const [open, setOpen] = useState(false)
  const species = item.species?.length ? item.species.join(' · ') : ''
  const meta = [item.format, species, formatDate(item.targetDate), item.status].filter(Boolean)
  const postedHref = safeHttpUrl(item.postedLink)
  const statusValue = EDITABLE_STATUSES.includes(item.status) ? item.status : (item.status || '')

  return (
    <article className="bg-card border border-line rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="w-full text-left px-4 py-3.5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold text-sm text-ink leading-snug">{item.idea}</h2>
          {item.priority && (
            <span className={`text-xs font-semibold flex-shrink-0 ${priorityClass(item.priority)}`}>
              {item.priority}
            </span>
          )}
        </div>
        {item.hook && <p className="text-sm text-ink-2 mt-1 leading-snug">{item.hook}</p>}
        {meta.length > 0 && (
          <p className="text-xs text-muted mt-2">{meta.join(' · ')}</p>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-line pt-3 space-y-3">
          {item.shotNotes && (
            <div>
              <p className="eyebrow mb-1">Shot notes</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{item.shotNotes}</p>
            </div>
          )}
          {item.gear && (
            <div>
              <p className="eyebrow mb-1">Gear</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{item.gear}</p>
            </div>
          )}
          {item.maslow && (
            <div>
              <p className="eyebrow mb-1">Maslow layer</p>
              <p className="text-sm text-ink">{item.maslow}</p>
            </div>
          )}
          {item.postedLink && (
            <div>
              <p className="eyebrow mb-1">Posted link</p>
              {postedHref ? (
                <a href={postedHref} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent underline underline-offset-2">
                  Open
                </a>
              ) : (
                <p className="text-sm text-ink break-all">{item.postedLink}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor={`status-${item.id}`} className="eyebrow block mb-1">Status</label>
            <select
              id={`status-${item.id}`}
              value={statusValue}
              disabled={saving}
              onChange={event => onSave(item.id, { status: event.target.value })}
              className="field"
            >
              {!statusValue && <option value="">—</option>}
              {EDITABLE_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
              {item.status && !EDITABLE_STATUSES.includes(item.status) && (
                <option value={item.status} disabled>{item.status}</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor={`date-${item.id}`} className="eyebrow block mb-1">Target shoot date</label>
            <input
              id={`date-${item.id}`}
              type="date"
              value={item.targetDate || ''}
              disabled={saving}
              onChange={event => onSave(item.id, { targetDate: event.target.value || null })}
              className="field"
            />
          </div>

          {saving && <p className="text-xs text-muted">Saving</p>}
          {error && <p className="text-sm text-bad">{error}</p>}
        </div>
      )}
    </article>
  )
}

export default function ShootClient() {
  const [items, setItems] = useState(null)
  const [connected, setConnected] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [family, setFamily] = useState('All')
  const [hidePosted, setHidePosted] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const itemsRef = useRef([])

  const commitItems = useCallback((next) => {
    itemsRef.current = next
    setItems(next)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notion/shoots')
      const data = await res.json()
      if (data.connected === false) {
        setConnected(false)
        commitItems([])
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setConnected(true)
      commitItems(sortShoots(data.items ?? []))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [commitItems])

  useEffect(() => { load() }, [load])

  async function save(id, patch) {
    const snapshot = itemsRef.current
    const previous = snapshot.find(item => item.id === id)
    if (!previous) return
    const next = sortShoots(snapshot.map(item => item.id === id ? { ...item, ...patch } : item))
    commitItems(next)
    setSaveError(null)
    setSavingId(id)
    try {
      const res = await fetch('/api/notion/shoots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save')
    } catch (err) {
      const restored = sortShoots(itemsRef.current.map(item => {
        if (item.id !== id) return item
        const copy = { ...item }
        for (const key of Object.keys(patch)) copy[key] = previous[key]
        return copy
      }))
      commitItems(restored)
      setSaveError({ id, message: err.message || 'Could not save' })
    } finally {
      setSavingId(null)
    }
  }

  const visible = filterShoots(items ?? [], { family, hidePosted })

  return (
    <main className="pb-24 min-h-screen">
      <div className="max-w-lg mx-auto px-4 pt-16">
        <p className="eyebrow mb-2">Shoot list</p>
        <h1 className="font-display text-[2rem] uppercase leading-none">Shoot</h1>
        {connected && items && (
          <p className="text-sm text-ink-2 mt-2">
            {visible.length} {hidePosted ? 'to shoot' : 'on the list'}
          </p>
        )}

        {!loading && connected && !error && (
          <div className="flex gap-2 mt-5 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
            {FAMILY_FILTERS.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setFamily(name)}
                aria-pressed={family === name}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg border ${
                  family === name ? 'bg-ink text-white border-ink' : 'bg-card text-ink-2 border-line'
                }`}
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setHidePosted(value => !value)}
              aria-pressed={hidePosted}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg border ${
                hidePosted ? 'bg-ink text-white border-ink' : 'bg-card text-ink-2 border-line'
              }`}
            >
              Hide posted
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
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
          <div className="border border-dashed border-line-strong rounded-xl p-10 text-center">
            <p className="font-semibold text-ink mb-1">Couldn&apos;t load the shoot list</p>
            <p className="text-xs text-muted">{error}</p>
          </div>
        )}

        {!loading && !error && !connected && (
          <div className="border border-dashed border-line-strong rounded-xl p-10 text-center">
            <p className="font-semibold text-ink mb-1">Shoot List isn&apos;t connected yet</p>
            <p className="text-xs text-muted">Share the Shoot List database with the Notion integration.</p>
          </div>
        )}

        {!loading && !error && connected && visible.length === 0 && (
          <div className="border border-dashed border-line-strong rounded-xl p-10 text-center">
            <p className="font-semibold text-ink mb-1">Nothing to shoot</p>
            <p className="text-xs text-muted">
              {hidePosted ? 'Posted items are hidden.' : 'No ideas in this filter.'}
            </p>
          </div>
        )}

        {!loading && !error && connected && visible.length > 0 && (
          <div className="space-y-2">
            {visible.map(item => (
              <ShootCard
                key={item.id}
                item={item}
                saving={savingId === item.id}
                error={saveError?.id === item.id ? saveError.message : null}
                onSave={save}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
