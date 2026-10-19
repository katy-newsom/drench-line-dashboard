'use client'
import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useUser } from '@/app/context/UserContext'

const VoiceNoteModal = dynamic(() => import('@/app/components/drench/modals/VoiceNoteModal'))

const LINKS = [
  { href: '/episodes', label: 'Episodes', detail: 'Status board and prep notes' },
  { href: '/submissions', label: 'Listener questions', detail: 'Logged questions and the website inbox' },
  { href: '/ideas', label: 'Ideas', detail: 'Topics to try' },
  { href: '/guests', label: 'Guests', detail: 'People to book' },
  { href: '/social', label: 'Social calendar', detail: 'Posts from the content calendar' },
]

export default function MorePage() {
  const { user, openSelector } = useUser()
  const [voiceOpen, setVoiceOpen] = useState(false)

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 pt-16">
        <p className="eyebrow mb-2">Everything else</p>
        <h1 className="font-display text-[2rem] uppercase leading-none mb-6">More</h1>

        <div className="bg-card border border-line rounded-xl overflow-hidden">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between gap-3 px-4 py-4 border-b border-line last:border-0"
            >
              <span>
                <span className="block font-semibold text-ink">{link.label}</span>
                <span className="block text-sm text-muted mt-0.5">{link.detail}</span>
              </span>
              <span className="text-muted text-sm">→</span>
            </Link>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            onClick={() => setVoiceOpen(true)}
            className="w-full text-left bg-card border border-line rounded-xl px-4 py-4"
          >
            <span className="block font-semibold">Voice note</span>
            <span className="block text-sm text-muted mt-0.5">Saved with ideas</span>
          </button>
          <button
            onClick={openSelector}
            className="w-full text-left bg-card border border-line rounded-xl px-4 py-4"
          >
            <span className="block font-semibold">Switch person</span>
            <span className="block text-sm text-muted mt-0.5">{user ? `Signed in as ${user}` : 'Pick a name'}</span>
          </button>
        </div>
      </div>

      {voiceOpen && <VoiceNoteModal user={user} onClose={() => setVoiceOpen(false)} />}
    </main>
  )
}
