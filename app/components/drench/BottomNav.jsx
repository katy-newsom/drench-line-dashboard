'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/leads',
    label: 'Sponsors',
    match: ['/leads'],
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/downloads',
    label: 'Downloads',
    match: ['/downloads'],
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6" />
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Expenses',
    match: ['/expenses'],
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4M7 4h10a2 2 0 012 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    href: '/more',
    label: 'More',
    match: ['/more', '/episodes', '/submissions', '/ideas', '/guests', '/social'],
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    ),
  },
]

function matches(pathname, prefixes) {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))
}

export default function BottomNav() {
  const pathname = usePathname()
  const visible = TABS.some(tab => matches(pathname, tab.match))
  if (!visible) return null

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30">
      <div className="max-w-lg mx-auto bg-paper border-t border-line safe-area-bottom">
        <div className="grid grid-cols-4 h-16">
          {TABS.map(tab => {
            const active = matches(pathname, tab.match)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 ${active ? 'text-accent' : 'text-muted'}`}
              >
                {tab.icon(active)}
                <span className="text-[10px] font-semibold tracking-wide uppercase">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
