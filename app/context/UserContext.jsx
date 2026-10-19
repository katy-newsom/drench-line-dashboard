'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'drenchline_user'
const UserCtx = createContext({
  user: null,
  setUser: () => {},
  selectorOpen: false,
  openSelector: () => {},
  closeSelector: () => {},
  ready: false,
})

export function UserProvider({ children }) {
  const [user, setUserState] = useState(null)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setUserState(saved)
    else setSelectorOpen(true)
    setReady(true)
  }, [])

  function setUser(name) {
    if (name) localStorage.setItem(STORAGE_KEY, name)
    else localStorage.removeItem(STORAGE_KEY)
    setUserState(name)
    setSelectorOpen(false)
  }

  function openSelector() {
    setSelectorOpen(true)
  }

  function closeSelector() {
    if (user) setSelectorOpen(false)
  }

  return (
    <UserCtx.Provider value={{ user, setUser, selectorOpen, openSelector, closeSelector, ready }}>
      {children}
    </UserCtx.Provider>
  )
}

export function useUser() {
  return useContext(UserCtx)
}
