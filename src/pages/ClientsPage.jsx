import { useState } from 'react'
import { useLeadsStore } from '../store/leadsStore'
import LeadDetailPanel from '../components/ui/LeadDetailPanel'

export default function ClientsPage() {
  const { clients, loading, error, restoreLead, deleteLead, statusColors, stageColors, exportCSV } = useLeadsStore()
  const [selectedClient, setSelectedClient] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c =>
    search === '' ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = clients.reduce((sum, c) => sum + (parseFloat(c.dealValue) || 0), 0)
  const avgDeal      = clients.length > 0 ? Math.round(totalRevenue / clients.length) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-96 gap-3">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading clients...</p>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full min-h-96">
      <p className="text-red-400 text-sm">Error: {error}</p>
    </div>
      )
    return (
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Clients</h1>
            <p className="text-gray-400 text-sm mt-0.5">{clients.length} paying clients</p>
          </div>
          <button
            onClick={() => exportCSV('clients')}
            className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            ⬇ Export CSV
          </button>
        </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-1">Total Clients</p>
          <p className="text-2xl font-bold text-white">{clients.length}</p>
          <p className="text-gray-600 text-xs mt-1">lifetime customers</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-orange-400">${totalRevenue.toLocaleString()}</p>
          <p className="text-gray-600 text-xs mt-1">from all clients</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-1">Avg Deal Value</p>
          <p className="text-2xl font-bold text-orange-400">${avgDeal}</p>
          <p className="text-gray-600 text-xs mt-1">per client</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 w-72 placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Table */}
      {clients.length === 0 ? (
        <div className="border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-400 text-sm">No clients yet.</p>
          <p className="text-gray-600 text-xs mt-1">Promote a lead to client from the Leads page.</p>
        </div>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                {['#', 'Company', 'Contact', 'Niche', 'Deal Value', 'Sender', 'Actions'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => (
                <tr
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                    i % 2 === 0 ? 'bg-gray-900/30' : 'bg-transparent'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{client.num}</td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{client.company}</p>
                    <p className="text-gray-500 text-xs">{client.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{client.contact}</p>
                    <p className="text-gray-500 text-xs">{client.title}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{client.niche}</td>
                  <td className="px-4 py-3">
                    <span className="text-orange-400 font-semibold">
                      ${parseFloat(client.dealValue || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{client.lastSender || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => restoreLead(client.id, 'Clients')}
                        className="text-xs text-gray-500 hover:text-orange-400 border border-gray-700 hover:border-orange-500 rounded-lg px-2 py-1 transition-colors"
                      >
                        ↩ To Leads
                      </button>
                      <button
                        onClick={() => deleteLead(client.id, 'Clients')}
                        className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-800">
            <p className="text-gray-600 text-xs">{filtered.length} of {clients.length} clients shown</p>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedClient && (
        <LeadDetailPanel
          lead={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

    </div>
  )
}