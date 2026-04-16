import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function MemberTable(){
  const { token } = useContext(AuthContext)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)

  const apiUrl = import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://gym-2-1xb9.onrender.com/api';
  async function fetchMembers(){
    if(!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/members`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setMembers(data.members || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ fetchMembers() }, [token])

  async function removeMember(id){
    if(!window.confirm('Delete this member?')) return
    await fetch(`${apiUrl}/members/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    fetchMembers()
  }

  async function editMember(id){
    const name = window.prompt('New name')
    if(!name) return
    await fetch(`${apiUrl}/members/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name }) })
    fetchMembers()
  }

  if(loading && members.length === 0) return <div className="text-center py-20 text-gray-400">Loading directory...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Member Directory</h1>
          <p className="text-gray-400 mt-1">Manage and monitor all active and expired club memberships.</p>
        </div>
        <div className="text-sm font-medium text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-xl border border-cyan-500/20">
          {members.length} Total Athletes
        </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                <th className="px-8 py-5">Athlete</th>
                <th className="px-8 py-5">Contact Details</th>
                <th className="px-8 py-5">Plan Expiry</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map(m => {
                const isActive = m.expiryDate ? new Date(m.expiryDate) > new Date() : false
                return (
                  <tr key={m._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-bold text-white border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                          {m.name.charAt(0)}
                        </div>
                        <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{m.name}</div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-gray-400 font-medium">{m.phone}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">
                          {m.expiryDate ? new Date(m.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase mt-1 ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isActive ? '● Running' : '○ Expired'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => editMember(m._id)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => removeMember(m._id)}
                          className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400/60 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {members.length === 0 && !loading && (
            <div className="p-20 text-center">
              <div className="text-4xl mb-4 opacity-20">📂</div>
              <div className="text-gray-500 font-medium">No members found in the database.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
