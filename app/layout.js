import { Archivo } from 'next/font/google'
import './globals.css'
import { UserProvider } from './context/UserContext'
import BottomNav from './components/drench/BottomNav'
import ProfileSelector from './components/drench/ProfileSelector'
import FAB from './components/drench/FAB'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-archivo',
  display: 'swap',
})

export const metadata = {
  title: 'Drench Line Dashboard',
  description: 'Internal tool for the Drench Line podcast team',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="bg-white text-black min-h-screen font-archivo">
        <UserProvider>
          <ProfileSelector />
          {children}
          <FAB />
          <BottomNav />
        </UserProvider>
      </body>
    </html>
  )
}
