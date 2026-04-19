import React, { useState, useContext } from 'react'
import axios from 'axios'
import { AuthContext } from '../context/AuthContext'

export default function AddMember({ onNavigate }) {
  const { token } = useContext(AuthContext)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [dob, setDob] = useState('')
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('06:00')
  const [endTime, setEndTime] = useState('08:00')
  const [timeSlot, setTimeSlot] = useState('')
  const [membershipType, setMembershipType] = useState('monthly')
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [amountReceived, setAmountReceived] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const plans = [
    { label: 'Monthly', value: 'monthly' },
    { label: '3 Months', value: 'quarterly' },
    { label: '6 Months', value: 'sixmonth' },
    { label: 'Annual', value: 'yearly' },
  ]

  const paymentOptions = [
    { label: 'Online', value: 'online' },
    { label: 'Cash', value: 'cash' },
    { label: 'Pending', value: 'pending' },
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
    const apiUrl = import.meta.env.DEV ? 'http://localhost:5005/api' : import.meta.env.VITE_API_URL;
    try {
      const res = await fetch(`${apiUrl}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          name, 
          phone, 
          address,
          dob,
          joinDate,
          timeSlot,
          membershipType,
          paymentStatus,
          amountReceived: Number(amountReceived) || 0,
          customMessage
        })
      })

      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.reload();
        return;
      }

      const data = await res.json()
      if(res.ok){
        let paymentMsg = '';
        if (paymentStatus === 'online') paymentMsg = 'Payment marked as Online.';
        else if (paymentStatus === 'cash') paymentMsg = 'Payment marked as Cash.';
        else paymentMsg = 'Fees marked as Pending.';
        
        setMessage({ text: `Member successfully created! ${paymentMsg} RFC Welcome Message Sent.`, type: 'success' })
        
        setName(''); setPhone(''); setAddress(''); setCustomMessage(''); setAmountReceived('');
        setTimeout(() => {
          if (onNavigate) onNavigate('dashboard');
        }, 2000);
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
        <p className="text-sm md:text-base text-gray-400 mt-1">Register members into RFC Gym and initiate their membership sequence.</p>
      </div>

      <div className="glass-card p-4 md:p-8 rounded-2xl md:rounded-3xl">
        <form onSubmit={submit} className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5 md:space-y-2 min-w-0">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                className="w-full max-w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="Ex. John Wick" 
                value={name} 
                onChange={e=>setName(e.target.value.replace(/[^A-Za-z\s]/g, ''))} 
              />
            </div>
            <div className="space-y-1.5 md:space-y-2 min-w-0">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Phone Number (WhatsApp)</label>
              <input 
                type="tel" pattern="[0-9]*"
                maxLength="12"
                className="w-full max-w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="Ex. 9876543210 or 919876543210" 
                value={phone} 
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))} 
              />
            </div>
            <div className="space-y-1.5 md:space-y-2 min-w-0">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Address</label>
              <input 
                className="w-full max-w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" 
                placeholder="Ex. 123 Main St, Springfield" 
                value={address} 
                onChange={e=>setAddress(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5 md:space-y-2 min-w-0">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Date of Birth (Optional)</label>
              <input 
                type="date" 
                className="w-full max-w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08]" 
                value={dob} 
                onChange={e=>setDob(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5 md:space-y-2 min-w-0">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Joining Date</label>
              <input 
                type="date" 
                className="w-full max-w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08]" 
                value={joinDate} 
                onChange={e=>setJoinDate(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5 md:space-y-2 min-w-0">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Start Time</label>
              <input type="time" className="w-full max-w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50" value={startTime} onChange={e=>setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:space-y-2 min-w-0">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">End Time</label>
              <input type="time" className="w-full max-w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50" value={endTime} onChange={e=>setEndTime(e.target.value)} />
              {durationExceeded() && <div className="text-red-400 text-[10px] md:text-xs mt-1">Duration cannot exceed 2 hours</div>}
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
            <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
              {paymentOptions.map(p => (
                <button
                  type="button"
                  key={p.value}
                  onClick={()=>setPaymentStatus(p.value)}
                  className={`p-2.5 md:p-4 rounded-lg md:rounded-xl border transition-all text-sm md:text-base ${
                    paymentStatus === p.value 
                      ? p.value === 'pending' 
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold' 
                        : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {paymentStatus !== 'pending' && (
              <div className="pt-2">
                <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Amount Received (₹)</label>
                <input 
                  type="number"
                  className="w-full mt-1.5 md:mt-2 bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08]" 
                  placeholder="Ex. 1500" 
                  value={amountReceived} 
                  onChange={e=>setAmountReceived(e.target.value)} 
                />
              </div>
            )}
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
            <div className={`relative overflow-hidden p-3 md:p-4 rounded-lg md:rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              <div className="relative z-10">{message.text}</div>
              {message.type === 'success' && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1.5 md:h-1 bg-emerald-500" 
                  style={{ transformOrigin: 'left', animation: 'shrinkBar 2s linear forwards' }} 
                />
              )}
            </div>
          )}

          <div className="pt-2 md:pt-4">
            <button 
              disabled={loading || durationExceeded()}
              type="submit" 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 md:py-4 rounded-lg md:rounded-xl transition-all disabled:opacity-50 text-sm md:text-base"
            >
              {loading ? 'Processing Registration...' : 'Onboard Member →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
