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
    href: '/ideas',
    label: 'Ideas',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke={active ? '#CC0000' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 015.29 11.58A4 4 0 0116 17H8a4 4 0 01-1.29-3.42A7 7 0 0112 2z" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/guests',
    label: 'Guests',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke={active ? '#CC0000' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: '/leads',
    label: 'Leads',
    disabled: true,
    icon: () => (
      <svg className="w-5 h-5" fill="none" stroke="#d1d5db" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Don't render for non-drench routes
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/episodes') &&
      !pathname.startsWith('/ideas') && !pathname.startsWith('/guests') && !pathname.startsWith('/leads')) {
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
