import { Archivo_Black, Archivo_Narrow } from 'next/font/google'
import './globals.css'
import { UserProvider } from './context/UserContext'
import BottomNav from './components/drench/BottomNav'
import TopBar from './components/drench/TopBar'
import ProfileSelector from './components/drench/ProfileSelector'

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo-black',
  display: 'swap',
})

const archivoNarrow = Archivo_Narrow({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-archivo-narrow',
  display: 'swap',
})

export const metadata = {
  title: 'Drench Line',
  description: 'Sponsors, downloads, shoot list, and expenses for the Drench Line podcast',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${archivoBlack.variable} ${archivoNarrow.variable}`}>
      <body className="bg-paper text-ink min-h-screen font-sans">
        <UserProvider>
          <TopBar />
          <ProfileSelector />
          {children}
          <BottomNav />
        </UserProvider>
      </body>
    </html>
  )
}
