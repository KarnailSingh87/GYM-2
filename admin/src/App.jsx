import { useContext, useState } from 'react'
import { AuthProvider, AuthContext } from './context/AuthContext'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import AddMember from './pages/AddMember'
import Dashboard from './pages/Dashboard'
import MemberTable from './components/MemberTable'
import Settings from './pages/Settings'
import './index.css'

function AppInner(){
  const { token } = useContext(AuthContext)
  const [view, setView] = useState('dashboard')

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if(!token) return <Login />

  return (
    <div className="flex min-h-screen relative">
      <div className={`fixed inset-0 bg-black/50 z-20 md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      
      <div className={`fixed md:sticky top-0 z-30 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <Sidebar onNavigate={(v) => { setView(v); setIsMobileMenuOpen(false); }} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <div className="md:hidden flex items-center justify-between p-4 glass-dark sticky top-0 z-10">
          <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">GYM MASTER</div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </div>
        
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {view === 'dashboard' && <Dashboard />}
            {view === 'add' && <AddMember />}
            {view === 'members' && <MemberTable />}
            {view === 'settings' && <Settings />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App(){
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
