'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (active) => (
      <svg className="w-5 h-5" fill={active ? '#CC0000' : 'currentColor'} viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path fill="white" d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    href: '/episodes',
    label: 'Episodes',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke={active ? '#CC0000' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polygon fill={active ? '#CC0000' : 'currentColor'} stroke="none" points="10,8 16,12 10,16" />
      </svg>
    ),
  },
  {
    href: '/leads',
    label: 'Sponsors',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke={active ? '#CC0000' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/submissions',
    label: 'Q&A',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke={active ? '#CC0000' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Expenses',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke={active ? '#CC0000' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Don't render for non-drench routes
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/episodes') &&
      !pathname.startsWith('/leads') && !pathname.startsWith('/submissions') && !pathname.startsWith('/expenses')) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-black safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {TABS.map(tab => {
          const active = pathname.startsWith(tab.href)
          if (tab.disabled) {
            return (
              <div key={tab.href} className="flex flex-col items-center gap-0.5 min-w-[60px] py-2 opacity-40 cursor-not-allowed">
                {tab.icon(false)}
                <span className="text-[10px] font-bold text-gray-400">{tab.label}</span>
              </div>
            )
          }
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 min-w-[60px] py-2"
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-bold ${active ? 'text-dl-red' : 'text-gray-500'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
