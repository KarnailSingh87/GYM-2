import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts'

function Dashboard(){
  const [members, setMembers] = useState([])
  const [error, setError] = useState(null)
  const [showPending, setShowPending] = useState(false)
  const [waStatus, setWaStatus] = useState({ connected: false })

  const { token } = useContext(AuthContext)
  const host = window.location.hostname;
  const apiUrl = import.meta.env.DEV 
    ? `http://${host}:5005/api` 
    : import.meta.env.VITE_API_URL;

  useEffect(()=>{
    if(!token) return
    fetch(`${apiUrl}/members`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r=>{
        if (r.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.reload();
          return;
        }
        return r.json();
      })
      .then(d=>{ 
        if(d && d.members) setMembers(d.members); 
        else if (d) setError('Unable to fetch');
      })
      .catch(e=>setError(e.message))

    fetch(`${apiUrl}/whatsapp/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r=>{
        if (r.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.reload();
          return;
        }
        return r.json();
      })
      .then(d=>{ if(d) setWaStatus(d) })
      .catch(e=>console.error('Failed to fetch WA status', e))
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

  // Generate chart data based on member join dates (last 6 months)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendsData = [];
  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  for(let i = 5; i >= 0; i--) {
    let d = new Date(currentYear, currentMonthIdx - i, 1);
    let monthLabel = monthNames[d.getMonth()];
    
    // Revenue & Signups for this month
    let monthRevenue = 0;
    let monthSignups = 0;

    members.forEach(m => {
      const joinD = new Date(m.joinDate);
      if (joinD.getMonth() === d.getMonth() && joinD.getFullYear() === d.getFullYear()) {
        monthSignups++;
        if (m.paymentStatus !== 'pending' && m.paymentStatus !== 'overdue') {
          monthRevenue += m.amountReceived > 0 ? m.amountReceived : (rateCard[m.membershipType] || 0);
        }
      }
    });

    trendsData.push({
      name: monthLabel,
      revenue: monthRevenue,
      signups: monthSignups
    });
  }

  const pieData = [
    { name: 'Active', value: activeMembers.length },
    { name: 'Expired', value: members.length - activeMembers.length }
  ];
  const COLORS = ['#10b981', '#ef4444'];

  const stats = [
    { label: 'Total Members', value: total, icon: '👥', color: 'from-blue-500/20 to-cyan-400/20', action: () => setShowPending(false) },
    { label: 'Pending Fees', value: pendingCount, icon: '⏳', color: 'from-amber-500/20 to-orange-400/20', action: () => setShowPending(true) },
    { label: 'Collected Revenue', value: `₹${collectedRevenue.toLocaleString('en-IN')}`, icon: '₹', color: 'from-emerald-500/20 to-teal-400/20', action: null },
  ]

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">Welcome back, hope you have a productive day.</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 py-1.5 px-3 rounded-full border border-white/10">
          <div className={`w-2.5 h-2.5 rounded-full ${waStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs font-semibold text-gray-300">
            WA {waStatus.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-2 glass-card p-5 md:p-6 rounded-2xl relative overflow-hidden">
          <h3 className="text-sm font-semibold tracking-wide text-gray-400 uppercase mb-4">Revenue Trend (Last 6 Months)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#ffffff10', borderRadius: '8px' }}
                  itemStyle={{ color: '#0ab5d4' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Status Pie Chart */}
        <div className="glass-card p-5 md:p-6 rounded-2xl relative overflow-hidden flex flex-col justify-center items-center">
          <h3 className="text-sm font-semibold tracking-wide text-gray-400 uppercase self-start w-full mb-2">Member Status</h3>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#ffffff10', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{activeMembers.length}</span>
              <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Active</span>
            </div>
          </div>
          <div className="flex gap-4 mt-2 w-full justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs text-gray-400">Active</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-xs text-gray-400">Expired</span></div>
          </div>
        </div>
        
        {/* Sign Ups Bar Chart */}
        <div className="lg:col-span-3 glass-card p-5 md:p-6 rounded-2xl relative overflow-hidden">
          <h3 className="text-sm font-semibold tracking-wide text-gray-400 uppercase mb-4">Sign Up Trends (Last 6 Months)</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#ffffff10', borderRadius: '8px' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="signups" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {trendsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={'#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
