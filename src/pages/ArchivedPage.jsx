import { useState } from 'react'
import { useLeadsStore } from '../store/leadsStore'
import LeadDetailPanel from '../components/ui/LeadDetailPanel'

export default function ArchivedPage() {
  const { archived, restoreLead, loading, exportCSV } = useLeadsStore()
  const [selectedLead, setSelectedLead] = useState(null)

  const restore = (e, lead) => {
    e.stopPropagation()
    restoreLead(lead.id, 'Archived')
  }

  return (
    <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Archived</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {archived.length} cold leads — not active but not lost
              </p>
            </div>
            <button
              onClick={() => exportCSV('archived')}
              className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              ⬇ Export CSV
            </button>
          </div>

      {archived.length === 0 ? (
        <div className="border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🗄️</p>
          <p className="text-gray-400 text-sm">No archived leads yet.</p>
          <p className="text-gray-600 text-xs mt-1">
            Cold leads and Lost deals are archived here automatically.
          </p>
        </div>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                {['#', 'Company', 'Contact', 'Niche', 'Status', 'Last Sender', 'Follow Ups', ''].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {archived.map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer opacity-70 hover:opacity-100 ${
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
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${
                      lead.status === 'Lost'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{lead.lastSender || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-500 font-mono text-xs">{lead.followUpCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => restore(e, lead)}
                      className="text-xs text-gray-500 hover:text-orange-400 border border-gray-700 hover:border-orange-500 rounded-lg px-2 py-1 transition-colors"
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