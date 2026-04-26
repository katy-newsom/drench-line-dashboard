'use client'
import { useState, useEffect } from 'react'

const MILESTONES = [
  { key: 'first_sponsor', label: '🎉 First sponsor lead!' },
  { key: 'episodes_10', label: '🎙️ 10 episodes live!' },
  { key: 'ideas_25', label: '💡 25 ideas submitted!' },
  { key: 'downloads_50', label: '🏆 50 total downloads!' },
]

export function useMilestones() {
  function isDismissed(key) {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(`milestone_${key}`) === '1'
  }

  function dismiss(key) {
    localStorage.setItem(`milestone_${key}`, '1')
  }

  return { isDismissed, dismiss }
}

export default function MilestoneToast({ milestoneKey }) {
  const [visible, setVisible] = useState(false)
  const milestone = MILESTONES.find(m => m.key === milestoneKey)

  useEffect(() => {
    if (!milestone) return
    const dismissed = localStorage.getItem(`milestone_${milestoneKey}`) === '1'
    if (!dismissed) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        localStorage.setItem(`milestone_${milestoneKey}`, '1')
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [milestoneKey, milestone])

  if (!visible || !milestone) return null

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-black text-white font-bold px-5 py-3 rounded-full shadow-xl text-sm whitespace-nowrap">
        {milestone.label}
      </div>
    </div>
  )
}
