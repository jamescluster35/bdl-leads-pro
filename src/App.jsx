import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import LeadsPage from './pages/LeadsPage'
import DashboardPage from './pages/DashboardPage'
import ArchivedPage from './pages/ArchivedPage'
import TemplatesPage from './pages/TemplatesPage'
import ClientsPage from './pages/ClientsPage'
import LoginPage from './pages/LoginPage'
import IntegrationsPage from './pages/IntegrationsPage'
import CalculatedLeadsPage from './pages/CalculatedLeadsPage'
import AuditReportPage from './pages/AuditReportPage'
import InboxPage from './pages/InboxPage'
import LostPage from './pages/LostPage'
import CampaignPage from './pages/CampaignPage'
import { useLeadsStore } from './store/leadsStore'
import { useTemplatesStore } from './store/templatesStore'
import { useIdleTimer } from './hooks/useIdleTimer'

export default function App() {
  const [isAuth, setIsAuth] = useState(() => {
    const auth    = localStorage.getItem('bdl_auth')
    const loginAt = localStorage.getItem('bdl_login_time')
    if (!auth || !loginAt) return false
    const EIGHT_HOURS = 8 * 60 * 60 * 1000
    if (Date.now() - parseInt(loginAt) > EIGHT_HOURS) {
      localStorage.removeItem('bdl_auth')
      localStorage.removeItem('bdl_login_time')
      return false
    }
    return true
  })

  const loadAll       = useLeadsStore(s => s.loadAll)
  const loadTemplates = useTemplatesStore(s => s.loadTemplates)

  const handleLogout = () => {
    localStorage.removeItem('bdl_auth')
    localStorage.removeItem('bdl_login_time')
    setIsAuth(false)
  }

  const handleLogin = () => {
    localStorage.setItem('bdl_auth', 'true')
    localStorage.setItem('bdl_login_time', Date.now().toString())
    setIsAuth(true)
  }

  const { showWarning, secondsLeft, stayLoggedIn } = useIdleTimer(handleLogout)

  useEffect(() => {
    if (isAuth) {
      loadAll()
      loadTemplates()
    }
  }, [isAuth])

  if (!isAuth) {
    return <LoginPage onLogin={handleLogin} />
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = String(secondsLeft % 60).padStart(2, '0')

  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">

        <Sidebar onLogout={handleLogout} />

        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/leads"     element={<LeadsPage />} />
            <Route path="/campaigns" element={<CampaignPage />} />
            <Route path="/inbox"     element={<InboxPage />} />
            <Route path="/lost"      element={<LostPage />} />
            <Route path="/calculated" element={<CalculatedLeadsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/archived"  element={<ArchivedPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/clients"   element={<ClientsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/audit" element={<AuditReportPage />} />
          </Routes>
        </main>

        {/* Idle warning popup */}
        {showWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-gray-900 border border-orange-500/50 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl text-center">
              <p className="text-3xl mb-3">⏱️</p>
              <h3 className="text-white font-semibold text-lg mb-1">Still there?</h3>
              <p className="text-gray-400 text-sm mb-2">
                You've been idle for 28 minutes.
              </p>
              <p className="text-orange-400 font-mono text-2xl font-bold mb-5">
                {mins}:{secs}
              </p>
              <p className="text-gray-500 text-xs mb-5">
                You'll be logged out automatically for security.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleLogout}
                  className="flex-1 border border-gray-700 text-gray-400 hover:text-white rounded-lg py-2.5 text-sm transition-colors"
                >
                  Log out
                </button>
                <button
                  onClick={stayLoggedIn}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
                >
                  Stay logged in
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </HashRouter>
  )
}
