import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useLeadsStore } from '../../store/leadsStore'

const NAV_GROUPS = [
  {
    label: '1. INBOUND PIPELINE',
    items: [
      { path: '/calculated',   label: 'Inbound Calculator', icon: '📥' },
    ]
  },
  {
    label: '2. OUTBOUND OUTREACH',
    items: [
      { path: '/campaigns',    label: 'Campaign Mailer',  icon: '🚀' },
      { path: '/leads',        label: 'Leads Directory',  icon: '👥' },
      { path: '/inbox',        label: 'Unified Inbox',    icon: '✉️' },
    ]
  },
  {
    label: '3. PIPELINE & RESULTS',
    items: [
      { path: '/clients',      label: 'Promoted Clients', icon: '💰' },
      { path: '/lost',         label: 'Lost Deals',       icon: '💔' },
      { path: '/archived',     label: 'Archived History', icon: '🗄️' },
    ]
  },
  {
    label: 'SYSTEM & TOOLS',
    items: [
      { path: '/dashboard',    label: 'Analytics Dashboard', icon: '📊' },
      { path: '/templates',    label: 'Email Templates',  icon: '📋' },
      { path: '/audit',        label: 'Audit Reports',    icon: '📄' },
      { path: '/integrations', label: 'API Integrations', icon: '🔌' },
    ]
  },
]


export default function Sidebar({ onLogout }) {
  const loading      = useLeadsStore(s => s.loading)
  const leads        = useLeadsStore(s => s.leads)
  const lostCount    = useLeadsStore(s => s.lost.length)
  const [open, setOpen] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueCount = leads.filter(l => {
    if (!l.followUpDate) return false
    const d = new Date(l.followUpDate)
    d.setHours(0, 0, 0, 0)
    return d <= today && l.status !== 'Cold' && l.status !== 'Lost' && l.status !== 'Pitched'
  }).length

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Blue Data Labs</p>
          <p className="text-sm font-bold text-white leading-tight">Leads Pro</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <div className="w-3 h-3 border border-gray-600 border-t-orange-500 rounded-full animate-spin" />}
          {overdueCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {overdueCount}
            </span>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slide in */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-56 bg-gray-900 border-r border-gray-800
        flex flex-col h-full shrink-0
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>

        {/* Brand — desktop only */}
        <div className="hidden lg:block px-5 py-5 border-b border-gray-800">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest">
            Blue Data Labs
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-sm font-bold text-white">Leads Pro</p>
            {loading && (
              <div className="w-3 h-3 border border-gray-600 border-t-orange-500 rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Spacer for mobile top bar */}
        <div className="lg:hidden h-16 shrink-0" />

        {/* Grouped Nav */}
        <nav className="flex-1 px-3 py-3 flex flex-col gap-4 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              {/* Section label */}
              <p className="px-3 mb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150
                       ${isActive
                         ? 'bg-orange-600 text-white font-medium'
                         : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                       }`
                    }
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.path === '/leads' && overdueCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {overdueCount}
                      </span>
                    )}
                    {item.path === '/lost' && lostCount > 0 && (
                      <span className="bg-red-900/70 text-red-300 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-red-700/50">
                        {lostCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800 flex flex-col gap-2">
          <p className="text-xs text-gray-600">BDL Leads Pro v1.0</p>
          <button
            onClick={onLogout}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors text-left"
          >→ Sign out</button>
        </div>

      </aside>
    </>
  )
}