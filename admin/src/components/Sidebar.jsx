import React, { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Sidebar({ onNavigate }){
  const { logout } = useContext(AuthContext)
  
  const navItems = [
    { label: 'Dashboard', view: 'dashboard', icon: '📊' },
    { label: 'Add Member', view: 'add', icon: '👤' },
    { label: 'All Members', view: 'members', icon: '📋' },
    { label: 'Settings', view: 'settings', icon: '⚙️' },
  ]

  return (
    <div className="w-64 glass-dark p-6 h-screen flex flex-col sticky top-0">
      <div className="mb-10">
        <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent glow-text">
          GYM MASTER
        </div>
        <div className="text-[10px] text-blue-400/60 font-semibold tracking-widest mt-1">MANAGEMENT SYSTEM</div>
      </div>
      
      <nav className="flex-1 space-y-3">
        {navItems.map(item => (
          <button 
            key={item.view}
            onClick={() => onNavigate(item.view)} 
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-white/5">
        <button 
          onClick={logout} 
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all text-gray-400 hover:text-red-400"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}
