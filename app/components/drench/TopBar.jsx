'use client'
import { useUser } from '@/app/context/UserContext'

export default function TopBar() {
  const { user, ready } = useUser()

  return (
    <header className="fixed top-0 inset-x-0 z-30">
      <div className="max-w-lg mx-auto h-14 bg-night px-4 flex items-center justify-between">
        <img
          src="/brand/logo-horizontal-white.png"
          alt="Drench Line"
          className="h-7 w-auto"
        />
        {ready && user ? (
          <span className="text-sm font-semibold text-white/70">{user}</span>
        ) : (
          <span className="text-sm font-semibold text-white/40">Drench Line</span>
        )}
      </div>
    </header>
  )
}
