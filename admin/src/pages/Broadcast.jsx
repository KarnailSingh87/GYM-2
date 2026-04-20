import React, { useState, useContext, useEffect } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Broadcast() {
  const { token } = useContext(AuthContext)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [waStatus, setWaStatus] = useState({ connected: false })
  const host = window.location.hostname;
  const apiUrl = import.meta.env.DEV ? `http://${host}:5005/api` : import.meta.env.VITE_API_URL || 'https://gym-2-1xb9.onrender.com/api'

  useEffect(() => {
    if (!token) return
    fetch(`${apiUrl}/whatsapp/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.reload();
          return;
        }
        return r.json();
      })
      .then(d => { if(d) setWaStatus(d) })
      .catch(e => console.error('Failed to fetch WA status', e))
  }, [token, apiUrl])

  const handleSend = async (e) => {
    e.preventDefault()

    if (!waStatus.connected) {
      setStatus({ type: 'error', text: 'WhatsApp is disconnected. Please go to settings and scan the QR code first.' })
      return
    }

    if (!message.trim()) {
      setStatus({ type: 'error', text: 'Message cannot be empty.' })
      return
    }

    setStatus(null)
    setLoading(true)

    try {
      const res = await fetch(`${apiUrl}/whatsapp/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: message.trim() })
      })

      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.reload();
        return;
      }

      const data = await res.json()

      if (res.ok) {
        setStatus({ type: 'success', text: data.message || 'Broadcast has started in the background!' })
        setMessage('')
      } else {
        setStatus({ type: 'error', text: data.message || 'Failed to start broadcast.' })
      }
    } catch (err) {
      setStatus({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  const templates = [
    "Reminder: The Gym will remain closed tomorrow for Diwali. Happy Holidays! 🪔",
    "Workout Tip of the Week: Stay hydrated! Always carry a bottle of water with you during your sets.",
    "Special Offer: Renew your yearly membership this week and get a 10% discount! Contact the front desk.",
    "Attention Members: We have installed new cardio equipment. Come test it out today!"
  ]

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mass Broadcasting</h1>
        <p className="text-sm md:text-base text-gray-400 mt-1">Send a custom WhatsApp message to all your active members.</p>
      </div>

      <div className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

        <form onSubmit={handleSend} className="relative z-10 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Your Message</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-h-[150px] text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all resize-y"
              placeholder="What would you like to say to your members?"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <p className="text-xs text-gray-500 ml-1">The system will automatically prefix "🔔 *RFC GYM ANNOUNCEMENT* 🔔" and greet the member by their name.</p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Quick Templates</label>
            <div className="flex flex-wrap gap-2">
              {templates.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage(template)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-xs md:text-sm text-gray-300 px-3 py-2 rounded-lg transition-colors text-left"
                >
                  {template.substring(0, 40)}...
                </button>
              ))}
            </div>
          </div>

          {status && (
            <div className={`p-4 rounded-xl text-sm font-medium ${status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {status.text}
            </div>
          )}

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all ${loading ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95'}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Sending...
                </>
              ) : (
                'Broadcast Now'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}