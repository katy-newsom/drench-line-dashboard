'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'drenchline_user'
const UserCtx = createContext({ user: null, setUser: () => {} })

export function UserProvider({ children }) {
  const [user, setUserState] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setUserState(saved)
  }, [])

  function setUser(name) {
    if (name) {
      localStorage.setItem(STORAGE_KEY, name)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setUserState(name)
  }

  return <UserCtx.Provider value={{ user, setUser }}>{children}</UserCtx.Provider>
}

export function useUser() {
  return useContext(UserCtx)
}
