import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

function AddMember(){
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('06:00')
  const [endTime, setEndTime] = useState('08:00')
  const [timeSlot, setTimeSlot] = useState('')
  const [membershipType, setMembershipType] = useState('monthly')
  const [customMessage, setCustomMessage] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const { token } = useContext(AuthContext)

  const plans = [
    { label: 'Monthly', value: 'monthly' },
    { label: '3 Months', value: 'quarterly' },
    { label: '6 Months', value: 'sixmonth' },
    { label: 'Annual', value: 'yearly' },
  ]

  // Effect to sync startTime/endTime into the timeSlot string
  React.useEffect(() => {
    const formatTime = (t) => {
      if(!t) return ''
      const [h, m] = t.split(':')
      const hour = parseInt(h)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${m} ${ampm}`
    }
    setTimeSlot(`${formatTime(startTime)} - ${formatTime(endTime)}`)
  }, [startTime, endTime])

  const durationExceeded = () => {
    if(!startTime || !endTime) return false
    const [h1, m1] = startTime.split(':').map(Number)
    const [h2, m2] = endTime.split(':').map(Number)
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
    return diff > 120 || diff < 0
  }

  async function submit(e){
    e.preventDefault()
    if(durationExceeded()){
      setMessage({ text: 'Duration cannot exceed 2 hours.', type: 'error' })
      return
    }
    if(!token){
      setMessage({ text: 'Admin token missing. Please login.', type: 'error' })
      return
    }
    setLoading(true)
    const apiUrl = import.meta.env.DEV ? 'http://localhost:5005/api' : 'https://gym-2-1xb9.onrender.com/api';
    try {
      const res = await fetch(`${apiUrl}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          name, 
          phone, 
          address,
          joinDate,
          timeSlot,
          membershipType,
          customMessage
        })
      })
      const data = await res.json()
      if(res.ok){
        setMessage({ text: 'Member successfully created! RFC Welcome Message Sent.', type: 'success' })
        setName(''); setPhone(''); setAddress(''); setCustomMessage('')
      } else {
        setMessage({ text: data.message || 'Operation failed', type: 'error' })
      }
    } catch (err) {
      setMessage({ text: 'Network connection failed', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Onboard New Member</h1>
        <p className="text-sm md:text-base text-gray-400 mt-1">Register athletes into RFC Gym and initiate their membership sequence.</p>
      </div>

      <div className="glass-card p-4 md:p-8 rounded-2xl md:rounded-3xl">
        <form onSubmit={submit} className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="Ex. John Wick" 
                value={name} 
                onChange={e=>setName(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Phone Number (WhatsApp)</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="+91 99999 00000" 
                value={phone} 
                onChange={e=>setPhone(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Address</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="Ex. 123 Main St, Springfield" 
                value={address} 
                onChange={e=>setAddress(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Joining Date</label>
              <input 
                type="date" 
                className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08]" 
                value={joinDate} 
                onChange={e=>setJoinDate(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Start Time</label>
              <input type="time" className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base" value={startTime} onChange={e=>setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">End Time</label>
              <input type="time" className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base" value={endTime} onChange={e=>setEndTime(e.target.value)} />
              {durationExceeded() && <div className="text-red-400 text-xs mt-1">Duration cannot exceed 2 hours</div>}
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Membership Plan</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
              {plans.map(p => (
                <button
                  type="button"
                  key={p.value}
                  onClick={()=>setMembershipType(p.value)}
                  className={`p-3 md:p-4 rounded-lg md:rounded-xl border transition-all text-sm md:text-base ${
                    membershipType === p.value 
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 font-bold' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Optional Custom Welcome Message</label>
            <textarea 
              rows="3"
              className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50" 
              placeholder="Add a special note..."
              value={customMessage}
              onChange={e=>setCustomMessage(e.target.value)}
            />
          </div>

          {message && (
            <div className={`p-3 md:p-4 rounded-lg md:rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {message.text}
            </div>
          )}

          <div className="pt-2 md:pt-4">
            <button 
              disabled={loading || durationExceeded()}
              type="submit" 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 md:py-4 rounded-lg md:rounded-xl transition-all disabled:opacity-50 text-sm md:text-base"
            >
              {loading ? 'Processing Registration...' : 'Onboard Athlete →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddMember
