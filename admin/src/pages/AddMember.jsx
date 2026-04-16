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
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/members`, {
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
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Onboard New Member</h1>
        <p className="text-gray-400 mt-1">Register athletes into RFC Gym and initiate their membership sequence.</p>
      </div>

      <div className="glass-card p-8 rounded-3xl">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="Ex. John Wick" 
                value={name} 
                onChange={e=>setName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Phone Number (WhatsApp)</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="+91 99999 00000" 
                value={phone} 
                onChange={e=>setPhone(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Joining Date</label>
              <input 
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all [color-scheme:dark]" 
                value={joinDate} 
                onChange={e=>setJoinDate(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Time Slot Duration (Max 2h)</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="time"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 outline-none focus:border-cyan-500/50 transition-all [color-scheme:dark] flex-1 text-sm"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
                <span className="text-gray-600 font-bold">to</span>
                <input 
                  type="time"
                  className={`bg-white/5 border rounded-xl px-3 py-3 outline-none transition-all [color-scheme:dark] flex-1 text-sm ${
                    durationExceeded() ? 'border-red-500/50 text-red-400' : 'border-white/10 focus:border-cyan-500/50'
                  }`}
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
              <div className="text-[10px] text-gray-500 flex justify-between px-1">
                <span>Selected: {timeSlot}</span>
                {durationExceeded() && <span className="text-red-400">Exceeds 2 hours!</span>}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Residential Address</label>
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all min-h-[80px]" 
              placeholder="Enter full address..." 
              value={address} 
              onChange={e=>setAddress(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Membership Plan</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {plans.map(plan => (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => setMembershipType(plan.value)}
                  className={`py-3 rounded-xl border transition-all font-medium text-sm ${
                    membershipType === plan.value 
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-500/10' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {plan.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Custom Message (Optional)</label>
              <span className="text-[10px] text-gray-600">Appended to the registration message</span>
            </div>
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all min-h-[60px] text-sm" 
              placeholder="Ex. Looking forward to see you tomorrow..." 
              value={customMessage} 
              onChange={e=>setCustomMessage(e.target.value)} 
            />
          </div>
          
          <div className="pt-4 border-t border-white/5">
            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              🚀 {loading ? 'Processing...' : 'Register Athlete & Send Confirmation'}
            </button>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-center text-sm border font-medium ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default AddMember
