import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Login(){
  const { setToken } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e){
    e.preventDefault()
    setError(null)
    setLoading(true)
    try{
      const apiUrl = import.meta.env.DEV ? 'http://localhost:5005/api' : 'https://gym-2-1xb9.onrender.com/api';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if(!res.ok) {
        setError(data.message || 'Login failed')
        return
      }
      setToken(data.token)
    } catch(err){
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-card p-10 rounded-3xl relative overflow-hidden group">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full" />
        
        <div className="relative z-10">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent glow-text">
              Admin Gateway
            </h2>
            <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest font-medium">Verify your identity</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="admin@gymmaster.com" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Secret Key</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="••••••••" 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl text-center">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
