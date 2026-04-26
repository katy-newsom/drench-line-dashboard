'use client'
import { useState, useEffect } from 'react'
import { useUser } from '@/app/context/UserContext'

export default function ProfileSelector() {
  const { user, setUser } = useUser()
  const [showSelector, setShowSelector] = useState(false)
  const [team, setTeam] = useState([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [showSwitch, setShowSwitch] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('drenchline_user')
    setShowSelector(!saved)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (showSelector) {
      setLoadingTeam(true)
      fetch('/api/notion/team')
        .then(r => r.json())
        .then(data => setTeam(data.team ?? []))
        .catch(() => setTeam([]))
        .finally(() => setLoadingTeam(false))
    }
  }, [showSelector])

  function selectUser(name) {
    setUser(name)
    setShowSelector(false)
    setShowSwitch(false)
  }

  if (!hydrated) return null

  return (
    <>
      {showSelector && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8">
          <h1 className="text-white text-4xl font-bold mb-2 text-center">
            Who&apos;s here?
          </h1>
          <p className="text-gray-400 mb-10 text-center text-sm">Select your name to get started</p>

          {loadingTeam ? (
            <div className="text-gray-400 text-lg">Loading team...</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              {team.map(member => (
                <button
                  key={member.id}
                  onClick={() => selectUser(member.name)}
                  className="bg-black text-white border-2 border-white font-bold py-5 px-4 rounded-xl text-base active:scale-95 transition-all hover:bg-dl-red hover:border-dl-red"
                >
                  {member.name}
                </button>
              ))}
              {team.length === 0 && (
                <div className="col-span-2 text-gray-500 text-center py-8">
                  Unable to load team. Check your Notion API key.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {user && !showSelector && (
        <div className="fixed top-3 left-3 z-40">
          <button
            onClick={() => setShowSwitch(s => !s)}
            className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20"
          >
            {user}
          </button>
          {showSwitch && (
            <div className="absolute top-full left-0 mt-1 bg-white border-2 border-black rounded-xl shadow-xl overflow-hidden animate-expand">
              <button
                onClick={() => { setShowSwitch(false); setShowSelector(true) }}
                className="block w-full text-left px-4 py-3 text-sm font-bold hover:bg-dl-red hover:text-white transition-colors"
              >
                Switch user
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
