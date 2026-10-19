'use client'
import { useState, useEffect } from 'react'
import { useUser } from '@/app/context/UserContext'

export default function ProfileSelector() {
  const { user, setUser, selectorOpen, closeSelector, ready } = useUser()
  const [team, setTeam] = useState([])
  const [loadingTeam, setLoadingTeam] = useState(false)

  useEffect(() => {
    if (!selectorOpen) return
    setLoadingTeam(true)
    fetch('/api/notion/team')
      .then(r => r.json())
      .then(data => setTeam(data.team ?? []))
      .catch(() => setTeam([]))
      .finally(() => setLoadingTeam(false))
  }, [selectorOpen])

  if (!ready || !selectorOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-paper flex justify-center">
      <div className="w-full max-w-lg min-h-screen flex flex-col">
        <div className="bg-night px-4 h-14 flex items-center">
          <img src="/brand/logo-horizontal-white.png" alt="Drench Line" className="h-7 w-auto" />
        </div>
        <div className="flex-1 flex flex-col px-6 pt-10">
          <p className="eyebrow mb-2">Team</p>
          <h1 className="font-display text-4xl uppercase leading-none mb-2">Who&apos;s here?</h1>
          <p className="text-ink-2 text-sm mb-8">Pick your name. This stays on this phone.</p>

          {loadingTeam ? (
            <p className="text-muted">Loading team...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {team.map(member => (
                <button
                  key={member.id}
                  onClick={() => setUser(member.name)}
                  className="bg-card text-ink border border-line-strong font-semibold py-5 px-4 rounded-xl text-base active:bg-ink active:text-white"
                >
                  {member.name}
                </button>
              ))}
              {team.length === 0 && (
                <p className="col-span-2 text-muted text-sm">
                  Unable to load the team. Check the Notion connection.
                </p>
              )}
            </div>
          )}

          {user && (
            <button
              onClick={closeSelector}
              className="mt-8 text-sm font-semibold text-ink-2 underline underline-offset-4"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
