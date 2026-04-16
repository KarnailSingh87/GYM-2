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
  const [isDesktopMenuClosed, setIsDesktopMenuClosed] = useState(false)

  if(!token) return <Login />

  return (
    <div className="flex bg-gray-900 min-h-screen text-white font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      {/* Sidebar Container */}
      <div 
        className={`fixed md:relative z-50 h-screen flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 md:translate-x-0'}
          ${isDesktopMenuClosed ? 'md:w-0 md:-translate-x-full md:opacity-0' : 'md:w-64 md:opacity-100'}
        `}
      >
        <div className="w-64 h-full border-r border-white/5 bg-gray-900">
           <Sidebar 
            onNavigate={(v) => { setView(v); setIsMobileMenuOpen(false); }} 
            onToggleDesktop={() => setIsDesktopMenuClosed(!isDesktopMenuClosed)} 
           />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 glass-dark border-b border-white/5 backdrop-blur-md bg-gray-900/80">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
            {isDesktopMenuClosed && (
              <button 
                onClick={() => setIsDesktopMenuClosed(false)} 
                className="hidden md:flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Expand Sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent md:hidden uppercase tracking-widest">RFC</div>
          </div>
        </div>
        
        <div className="flex-1 p-4 md:p-8 w-full max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {view === 'dashboard' && <Dashboard />}
            {view === 'add' && <AddMember onNavigate={setView} />}
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
