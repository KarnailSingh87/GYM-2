import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function EditMemberModal({ member, onClose, onSuccess, token, apiUrl }) {
  // Try parsing timeSlot to init startTime and endTime, e.g. "6:00 AM - 8:00 AM" -> "06:00", "08:00"
  let initialStart = '06:00';
  let initialEnd = '08:00';
  if (member.timeSlot && member.timeSlot.includes(' - ')) {
    const parts = member.timeSlot.split(' - ');
    const parseTime = (str) => {
      if (!str) return '06:00';
      const [time, ampm] = str.split(' ');
      let [h, m] = time.split(':');
      let hr = parseInt(h, 10);
      if (ampm === 'PM' && hr < 12) hr += 12;
      if (ampm === 'AM' && hr === 12) hr = 0;
      return `${hr.toString().padStart(2, '0')}:${m}`;
    };
    initialStart = parseTime(parts[0]);
    initialEnd = parseTime(parts[1]);
  }

  const [name, setName] = useState(member.name || '')
  const [phone, setPhone] = useState(member.phone || '')
  const [address, setAddress] = useState(member.address || '')
  const [joinDate, setJoinDate] = useState(member.joinDate ? new Date(member.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState(initialStart)
  const [endTime, setEndTime] = useState(initialEnd)
  const [timeSlot, setTimeSlot] = useState(member.timeSlot || '')
  const [membershipType, setMembershipType] = useState(member.membershipType || 'monthly')
  const [paymentStatus, setPaymentStatus] = useState(member.paymentStatus || 'pending')
  const [amountReceived, setAmountReceived] = useState(member.amountReceived || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

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

  async function submit(e) {
    e.preventDefault()
    if(durationExceeded()){
      setMessage({ text: 'Duration cannot exceed 2 hours.', type: 'error' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/members/${member._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          name, phone, address, joinDate, timeSlot, membershipType, paymentStatus, amountReceived: Number(amountReceived) || 0
        })
      })
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.reload();
        return;
      }
      if(res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        setMessage({ text: data.message || 'Operation failed', type: 'error' })
      }
    } catch {
      setMessage({ text: 'Network connection failed', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-card p-4 md:p-8 rounded-2xl md:rounded-3xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Edit Member</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm" value={name} onChange={e=>setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm" value={phone} onChange={e=>setPhone(e.target.value)} required />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Address</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm" value={address} onChange={e=>setAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Joining Date</label>
              <input type="date" className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm" value={joinDate} onChange={e=>setJoinDate(e.target.value)} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Start Time</label>
              <input type="time" className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm text-center" value={startTime} onChange={e=>setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">End Time</label>
              <input type="time" className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm text-center" value={endTime} onChange={e=>setEndTime(e.target.value)} />
              {durationExceeded() && <div className="text-red-400 text-xs mt-1">Duration cannot exceed 2 hours</div>}
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Membership Plan</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
              {plans.map(p => (
                <button type="button" key={p.value} onClick={()=>setMembershipType(p.value)} className={`p-3 md:p-4 rounded-lg md:rounded-xl border text-sm ${membershipType === p.value ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 font-bold' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {paymentOptions.map(p => (
                <button type="button" key={p.value} onClick={()=>setPaymentStatus(p.value)} className={`p-3 md:p-4 rounded-lg md:rounded-xl border text-sm ${paymentStatus === p.value ? (p.value === 'pending' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold') : 'bg-white/5 border-white/10 text-gray-400'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            {paymentStatus !== 'pending' && (
              <div className="pt-2">
                <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Amount Received (₹)</label>
                <input type="number" className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm" value={amountReceived} onChange={e=>setAmountReceived(e.target.value)} />
              </div>
            )}
          </div>

          {message && <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{message.text}</div>}
          <button disabled={loading || durationExceeded()} type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
            {loading ? 'Processing...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function MemberTable(){
  const { token } = useContext(AuthContext)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const host = window.location.hostname;
  const apiUrl = import.meta.env.DEV 
    ? `http://${host}:5005/api` 
    : import.meta.env.VITE_API_URL;
  async function fetchMembers(){
    if(!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/members`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.reload();
        return;
      }
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
    const res = await fetch(`${apiUrl}/members/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.reload();
      return;
    }
    fetchMembers()
  }

  function editMember(id){
    const mem = members.find(m => m._id === id);
    if(mem) setEditingMember(mem);
  }

  function downloadPDF(filterType) {
    let filteredMembers = [];
    let title = "";
    let filename = "";

    if (filterType === 'active') {
      filteredMembers = members.filter(m => m.expiryDate && new Date(m.expiryDate) > new Date());
      title = "Active Members List - RFC Gym";
      filename = "RFC_Active_Members.pdf";
    } else if (filterType === 'pending') {
      filteredMembers = members.filter(m => m.paymentStatus === 'pending');
      title = "Pending Fees Members List - RFC Gym";
      filename = "RFC_Pending_Fees_Members.pdf";
    }

    if(filteredMembers.length === 0) {
      alert(`No ${filterType} members to download.`);
      return;
    }

    const doc = new jsPDF();
    doc.text(title, 14, 15);
    
    const tableColumn = ["Name", "Phone", "Address", "Join Date", "Expiry Date", "Plan", "Payment Status"];
    const tableRows = [];

    filteredMembers.forEach(m => {
      const row = [
        m.name || "N/A",
        m.phone || "N/A",
        m.address || "N/A",
        m.joinDate ? new Date(m.joinDate).toLocaleDateString() : "N/A",
        m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : "N/A",
        m.membershipType || "N/A",
        m.paymentStatus || "pending"
      ];
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save(filename);
  }

  const displayedMembers = members.filter(m => 
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.phone || '').includes(searchTerm)
  );

  if(loading && members.length === 0) return <div className="text-center py-20 text-gray-400">Loading directory...</div>

  return (
    <div className="space-y-4 md:space-y-6 pb-10">
      {editingMember && (
        <EditMemberModal 
          member={editingMember} 
          onClose={() => setEditingMember(null)}
          onSuccess={() => { setEditingMember(null); fetchMembers(); }}
          token={token}
          apiUrl={apiUrl}
        />
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Member Directory</h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">Manage and monitor all active and expired club memberships.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm md:text-base outline-none focus:border-cyan-500/50 focus:bg-white/[0.08]"
          />
          <button 
            onClick={() => downloadPDF('active')}
            className="text-xs md:text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-emerald-500/20 whitespace-nowrap transition-colors"
          >
            Active PDF 📄
          </button>
          <button 
            onClick={() => downloadPDF('pending')}
            className="text-xs md:text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-amber-500/20 whitespace-nowrap transition-colors"
          >
            Pending Fees PDF 📄
          </button>
          <div className="text-xs md:text-sm font-medium text-cyan-400 bg-cyan-500/10 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-cyan-500/20 whitespace-nowrap">
            {members.length} Total Members
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl md:rounded-3xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="text-[10px] md:text-[11px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                <th className="px-4 md:px-8 py-3 md:py-5">Member</th>
                <th className="px-4 md:px-8 py-3 md:py-5">Contact Details</th>
                <th className="px-4 md:px-8 py-3 md:py-5">Plan Expiry</th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayedMembers.map(m => {
                const isActive = m.expiryDate ? new Date(m.expiryDate) > new Date() : false
                return (
                  <tr key={m._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 md:px-8 py-3 md:py-5">
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs md:text-sm font-bold text-white border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                          {m.name.charAt(0)}
                        </div>
                        <div className="font-medium md:font-semibold text-sm md:text-base text-white group-hover:text-cyan-400 transition-colors truncate max-w-[120px] sm:max-w-xs">{m.name}</div>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-3 md:py-5 text-xs md:text-sm text-gray-400 font-medium whitespace-nowrap">{m.phone}</td>
                    <td className="px-4 md:px-8 py-3 md:py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-white text-xs md:text-sm font-medium">
                          {m.expiryDate ? new Date(m.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </span>
                        <span className={`text-[9px] md:text-[10px] font-bold uppercase mt-1 ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isActive ? '● Running' : '○ Expired'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-3 md:py-5 text-right">
                      <div className="flex justify-end space-x-1 md:space-x-2">
                        <button 
                          onClick={() => setEditingMember(m)}
                          className="p-1.5 md:p-2 rounded-md md:rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all text-sm md:text-base"
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
          {displayedMembers.length === 0 && !loading && (
            <div className="p-20 text-center">
              <div className="text-4xl mb-4 opacity-20">📂</div>
              <div className="text-gray-500 font-medium">No members match your search criteria.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
