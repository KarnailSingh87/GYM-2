import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

function Dashboard(){
  const [members, setMembers] = useState([])
  const [error, setError] = useState(null)

  const { token } = useContext(AuthContext)
  const apiUrl = import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://gym-2-1xb9.onrender.com/api';
  useEffect(()=>{
    if(!token) return
    fetch(`${apiUrl}/members`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r=>r.json())
      .then(d=>{ if(d.members) setMembers(d.members); else setError('Unable to fetch') })
      .catch(e=>setError(e.message))
  }, [token])

  const total = members.length
  const active = members.filter(m => new Date(m.expiryDate) > new Date()).length
  const revenue = total * 30

  const stats = [
    { label: 'Total Members', value: total, icon: '👥', color: 'from-blue-500/20 to-cyan-400/20' },
    { label: 'Active Plans', value: active, icon: '⚡', color: 'from-emerald-500/20 to-teal-400/20' },
    { label: 'Estimated Revenue', value: `$${revenue}`, icon: '💰', color: 'from-amber-500/20 to-orange-400/20' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-gray-400 mt-1">Welcome back, hope you have a productive day.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-card p-6 rounded-2xl relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
              <div className="text-3xl mb-4">{stat.icon}</div>
              <h3 className="text-sm font-medium text-gray-400 tracking-wider uppercase">{stat.label}</h3>
              <div className="text-3xl font-bold mt-2 glow-text">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Recent Registrations</h3>
          <button className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">View All →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Expiry Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.slice(0, 5).map(m => {
                const isActive = new Date(m.expiryDate) > new Date()
                return (
                  <tr key={m._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white group-hover:text-cyan-400 transition-colors">{m.name}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{m.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
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
          {members.length === 0 && <div className="p-10 text-center text-gray-500">No members found yet.</div>}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
