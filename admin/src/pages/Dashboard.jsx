import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

function Dashboard(){
  const [members, setMembers] = useState([])
  const [error, setError] = useState(null)
  const [showPending, setShowPending] = useState(false)

  const { token } = useContext(AuthContext)
  const apiUrl = import.meta.env.DEV ? 'http://localhost:5005/api' : 'https://gym-2-1xb9.onrender.com/api';
  useEffect(()=>{
    if(!token) return
    fetch(`${apiUrl}/members`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r=>r.json())
      .then(d=>{ if(d.members) setMembers(d.members); else setError('Unable to fetch') })
      .catch(e=>setError(e.message))
  }, [token])

  const activeMembers = members.filter(m => new Date(m.expiryDate) > new Date())
  const total = members.length
  const active = activeMembers.length
  
  // Pending fee members
  const pendingMembers = members.filter(m => m.paymentStatus === 'pending')
  const pendingCount = pendingMembers.length
  
  // Real revenue calculated from currently active members in rupees
  const rateCard = {
    monthly: 1500,
    quarterly: 4000,
    sixmonth: 7500,
    yearly: 12000,
    other: 0
  };
  
  // Total real revenue generated from manually collected amounts, or fallback to rateCard if not provided but paid
  const collectedRevenue = members.reduce((acc, m) => {
    if (m.paymentStatus === 'pending' || m.paymentStatus === 'overdue') return acc;
    if (m.amountReceived && m.amountReceived > 0) return acc + m.amountReceived;
    return acc + (rateCard[m.membershipType] || 0);
  }, 0);

  const stats = [
    { label: 'Total Athletes', value: total, icon: '👥', color: 'from-blue-500/20 to-cyan-400/20', action: () => setShowPending(false) },
    { label: 'Pending Fees', value: pendingCount, icon: '⏳', color: 'from-amber-500/20 to-orange-400/20', action: () => setShowPending(true) },
    { label: 'Collected Revenue', value: `₹${collectedRevenue.toLocaleString('en-IN')}`, icon: '₹', color: 'from-emerald-500/20 to-teal-400/20', action: null },
  ]

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm md:text-base text-gray-400 mt-1">Welcome back, hope you have a productive day.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            onClick={stat.action}
            className={`glass-card p-5 md:p-6 rounded-2xl relative overflow-hidden group ${stat.action ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''} transition-all`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
              <div className="text-2xl md:text-3xl mb-3 md:mb-4">{stat.icon}</div>
              <h3 className="text-xs md:text-sm font-medium text-gray-400 tracking-wider uppercase">{stat.label}</h3>
              <div className="text-2xl md:text-3xl font-bold mt-2 glow-text">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-semibold text-base md:text-lg">
            {showPending ? 'Members with Pending Fees' : 'Recent Registrations'}
          </h3>
          <button 
            className="text-xs md:text-sm text-cyan-400 hover:text-cyan-300 font-medium"
            onClick={() => showPending ? setShowPending(false) : null}
          >
             {showPending ? 'Clear Filter ✕' : 'View All →'}
          </button>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="text-[10px] md:text-[11px] uppercase tracking-widest text-gray-500">
                <th className="px-4 md:px-6 py-3 md:py-4">Name</th>
                <th className="px-4 md:px-6 py-3 md:py-4">Contact</th>
                <th className="px-4 md:px-6 py-3 md:py-4">Expiry Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(showPending ? pendingMembers : members.slice(0, 5)).map(m => {
                const isActive = new Date(m.expiryDate) > new Date()
                return (
                  <tr key={m._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 md:px-6 py-3 md:py-4 truncate max-w-[150px] md:max-w-none">
                      <div className="font-medium text-sm md:text-base text-white group-hover:text-cyan-400 transition-colors">{m.name}</div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-400 truncate max-w-[120px] md:max-w-none">{m.phone}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <span className={`px-2 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap ${
                        isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {isActive ? 'Active' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {((showPending ? pendingMembers : members).length === 0) && <div className="p-6 md:p-10 text-center text-sm md:text-base text-gray-500">{showPending ? 'No members have pending fees.' : 'No members found yet.'}</div>}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
