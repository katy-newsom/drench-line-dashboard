'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useUser } from '@/app/context/UserContext'

const IdeaModal = dynamic(() => import('./modals/IdeaModal'))
const GuestModal = dynamic(() => import('./modals/GuestModal'))
const SponsorModal = dynamic(() => import('./modals/SponsorModal'))
const ExpenseModal = dynamic(() => import('./modals/ExpenseModal'))
const VoiceNoteModal = dynamic(() => import('./modals/VoiceNoteModal'))

const ACTIONS = [
  { key: 'idea', label: 'Submit Idea', icon: '💡' },
  { key: 'guest', label: 'Suggest Guest', icon: '👤' },
  { key: 'sponsor', label: 'Flag Sponsor', icon: '💰' },
  { key: 'expense', label: 'Log Expense', icon: '💸' },
  { key: 'voice', label: 'Voice Note', icon: '🎤' },
]

export default function FAB() {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState(null)

  function openModal(key) {
    setModal(key)
    setOpen(false)
  }

  function closeModal() {
    setModal(null)
  }

  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3">
        {open && (
          <div className="flex flex-col items-end gap-2 animate-fade-in">
            {ACTIONS.map(action => (
              <button
                key={action.key}
                onClick={() => openModal(action.key)}
                className="flex items-center gap-2 bg-white border-2 border-black text-black font-bold px-4 py-2 rounded-full shadow-lg active:scale-95 transition-transform whitespace-nowrap"
              >
                <span>{action.icon}</span>
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-14 h-14 bg-dl-red text-white rounded-full shadow-xl flex items-center justify-center text-2xl font-bold active:scale-95 transition-transform border-2 border-dl-red-dark"
          aria-label="Contribute"
        >
          <span className={`transition-transform duration-200 inline-block ${open ? 'rotate-45' : ''}`}>+</span>
        </button>
      </div>

      {modal === 'idea' && <IdeaModal user={user} onClose={closeModal} />}
      {modal === 'guest' && <GuestModal user={user} onClose={closeModal} />}
      {modal === 'sponsor' && <SponsorModal user={user} onClose={closeModal} />}
      {modal === 'expense' && <ExpenseModal user={user} onClose={closeModal} />}
      {modal === 'voice' && <VoiceNoteModal user={user} onClose={closeModal} />}
    </>
  )
}
