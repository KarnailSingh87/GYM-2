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
    <div className="w-64 glass-dark p-4 md:p-6 h-screen flex flex-col relative md:sticky top-0">
      <div className="mb-6 md:mb-10 pt-4 md:pt-0">
        <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent glow-text">
          GYM MASTER
        </div>
        <div className="text-[9px] md:text-[10px] text-blue-400/60 font-semibold tracking-widest mt-1">MANAGEMENT SYSTEM</div>
      </div>
      
      <nav className="flex-1 space-y-2 md:space-y-3 overflow-y-auto pr-2">
        {navItems.map(item => (
          <button 
            key={item.view}
            onClick={() => onNavigate(item.view)} 
            className="w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white group"
          >
            <span className="text-lg md:text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className="font-medium text-sm md:text-base">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-4 md:pt-6 border-t border-white/5 pb-20 md:pb-0">
        <button 
          onClick={logout} 
          className="w-full flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl hover:bg-red-500/10 transition-all text-gray-400 hover:text-red-400"
        >
          <span className="text-lg md:text-xl">🚪</span>
          <span className="font-medium text-sm md:text-base">Logout</span>
        </button>
      </div>
    </div>
  )
}
