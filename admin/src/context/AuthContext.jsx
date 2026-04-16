import React, { createContext, useEffect, useState } from 'react'

export const AuthContext = createContext()

export function AuthProvider({ children }){
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'))

  useEffect(() => {
    if(token) localStorage.setItem('admin_token', token)
    else localStorage.removeItem('admin_token')
  }, [token])

  const logout = () => setToken(null)

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
