import { useState } from 'react'
import { useLeadsStore } from '../store/leadsStore'
import LeadDetailPanel from '../components/ui/LeadDetailPanel'

export default function LostPage() {
  const { lost, restoreFromLost, loading, exportCSV } = useLeadsStore()
  const [selectedLead, setSelectedLead] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = lost.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      String(l.company || '').toLowerCase().includes(q) ||
      String(l.contact || '').toLowerCase().includes(q) ||
      String(l.email   || '').toLowerCase().includes(q)
    )
  })

  const restore = (e, lead) => {
    e.stopPropagation()
    restoreFromLost(lead.id)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Lost Deals</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {lost.length} deal{lost.length !== 1 ? 's' : ''} — not won, but not gone forever
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs">Syncing</span>
            </div>
          )}
          <button
            onClick={() => exportCSV('lost')}
            className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
        <span className="text-red-400 text-lg">💔</span>
        <div>
          <p className="text-red-400 text-sm font-medium">Deal not won — yet</p>
          <p className="text-red-400/60 text-xs">
            These were real leads whose deals didn't close. Re-engage with a new angle or restore them to the active pipeline anytime.
          </p>
        </div>
      </div>

      {/* Search */}
      {lost.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search company, contact, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 w-full sm:w-72 placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
        </div>
      )}

      {lost.length === 0 ? (
        <div className="border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-gray-400 text-sm">No lost deals yet.</p>
          <p className="text-gray-600 text-xs mt-1">
            When a deal doesn't close, mark the lead as "Lost" and it will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No results for "{search}"</p>
        </div>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                {['#', 'Company', 'Contact', 'Niche', 'Stage', 'Last Sender', 'Follow Ups', ''].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                    i % 2 === 0 ? 'bg-gray-900/30' : 'bg-transparent'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{lead.num}</td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{lead.company}</p>
                    <p className="text-gray-500 text-xs">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-300">{lead.contact}</p>
                    <p className="text-gray-500 text-xs">{lead.title}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{lead.niche}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs border bg-red-500/15 text-red-400 border-red-500/25">
                      {lead.dealStage || 'Lost'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{lead.lastSender || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-500 font-mono text-xs">{lead.followUpCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => restore(e, lead)}
                      className="text-xs text-gray-500 hover:text-orange-400 border border-gray-700 hover:border-orange-500 rounded-lg px-2 py-1 transition-colors whitespace-nowrap"
                    >
                      ↩ Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary stats */}
      {lost.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Lost</p>
            <p className="text-2xl font-bold text-red-400">{lost.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Pipeline Value</p>
            <p className="text-2xl font-bold text-gray-300">
              ${lost.reduce((s, l) => s + (parseFloat(l.dealValue) || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Avg Follow Ups</p>
            <p className="text-2xl font-bold text-gray-300">
              {lost.length > 0
                ? Math.round(lost.reduce((s, l) => s + (parseInt(l.followUpCount) || 0), 0) / lost.length)
                : 0}
            </p>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  )
}
