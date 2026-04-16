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

  if(!token) return <Login />

  return (
    <div className="flex min-h-screen">
      <Sidebar onNavigate={setView} />
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {view === 'dashboard' && <Dashboard />}
          {view === 'add' && <AddMember />}
          {view === 'members' && <MemberTable />}
          {view === 'settings' && <Settings />}
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
