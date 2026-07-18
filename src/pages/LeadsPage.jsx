import { useState, useMemo } from 'react'
import { useLeadsStore } from '../store/leadsStore'
import AddLeadModal from '../components/ui/AddLeadModal'
import LeadDetailPanel from '../components/ui/LeadDetailPanel'
import { calculateLeadScore } from '../lib/scoreHelper'

const COLS = ['#', 'Company', 'Contact', 'Niche', 'Status', 'Score', 'Stage', 'City', 'Last Sender', 'Follow Ups', 'Deal', '']

export default function LeadsPage() {
  const { leads, archived, statusColors, stageColors, deleteLead, loading, error, exportCSV } = useLeadsStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterNiche, setFilterNiche] = useState('All')
  const [sortBy, setSortBy] = useState('Default')

  // Dynamically extract unique niches present in the leads
  const availableNiches = ['All', ...new Set(leads.map(l => l.niche).filter(Boolean))]

  // Calculate counts for each status button dynamically
  const statusCounts = useMemo(() => {
    const counts = { All: 0, New: 0, Pitched: 0, Warm: 0, Cold: 0 }
    leads.forEach(l => {
      const matchSearch = search === '' ||
        (l.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.contact || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.email || '').toLowerCase().includes(search.toLowerCase())
      const matchNiche = filterNiche === 'All' || l.niche === filterNiche

      if (matchSearch && matchNiche) {
        counts.All++
        if (l.status && l.status in counts) {
          counts[l.status]++
        }
      }
    })
    return counts
  }, [leads, search, filterNiche])

  const filtered = leads.filter(l => {
    const matchSearch = search === '' ||
      (l.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.contact || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || l.status === filterStatus
    const matchNiche = filterNiche === 'All' || l.niche === filterNiche
    return matchSearch && matchStatus && matchNiche
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'Score') {
      return calculateLeadScore(b) - calculateLeadScore(a)
    }
    if (sortBy === 'Value') {
      return Number(b.dealValue || 0) - Number(a.dealValue || 0)
    }
    return 0
  })

  const getScoreBadgeClass = (s) => {
    if (s >= 70) return 'bg-red-500/20 text-red-400 border-red-500/30 font-bold shadow-sm shadow-red-500/10'
    if (s >= 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-semibold'
    return 'bg-gray-800 border-gray-700 text-gray-400'
  }

  // Only block if truly no data (first ever load with no cache)
  if (loading && leads.length === 0) return <LoadingScreen message="Loading leads from Google Sheets..." />
  if (error && leads.length === 0)   return <ErrorScreen message={error} />

        return (
          <div className="p-6">

            {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Leads Directory</h1>
            <p className="text-gray-400 text-xs mt-2 bg-orange-500/5 border border-orange-500/10 px-3 py-2 rounded-lg leading-relaxed max-w-2xl">
              <strong>👥 OUTBOUND STEP 2:</strong> Track and manage active prospects. Monitor their deal stages (New, Pitched, Warm, Cold), check their auto-calculated priority scores, and log custom outreach summaries.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-orange-400 text-xs">Syncing</span>
              </div>
            )}
            <button
              onClick={() => exportCSV('leads')}
              className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              ⬇ Export CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Lead
            </button>
          </div>
        </div>

        {showModal && <AddLeadModal onClose={() => setShowModal(false)} />}
        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
          />
        )}
      {/* Overdue banner */}
      {(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const overdue = leads.filter(l =>
          l.followUpDate &&
          new Date(l.followUpDate) <= today &&
          l.status !== 'Cold' && l.status !== 'Lost' && l.status !== 'Pitched'
        )
        if (overdue.length === 0) return null
        return (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-lg">⏰</span>
              <div>
                <p className="text-red-400 text-sm font-medium">
                  {overdue.length} follow up{overdue.length > 1 ? 's' : ''} overdue
                </p>
                <p className="text-red-400/60 text-xs">
                  {overdue.map(l => l.company).join(', ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterStatus('All')}
              className="text-xs text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-colors"
            >
              View all →
            </button>
          </div>
        )
      })()}

        {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search company, contact, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 w-full sm:w-72 placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
        {['All', 'New', 'Pitched', 'Warm', 'Cold'].map(s => {
          const count = statusCounts[s] || 0
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                filterStatus === s
                  ? 'bg-orange-600 border-orange-600 text-white font-medium shadow-sm shadow-orange-500/10'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {s} ({count})
            </button>
          )
        })}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500 uppercase font-semibold">Niche:</span>
          <select
            value={filterNiche}
            onChange={e => setFilterNiche(e.target.value)}
            className="bg-gray-850 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            {availableNiches.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <span className="text-xs text-gray-500 uppercase font-semibold">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-gray-850 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="Default">Default</option>
            <option value="Score">Priority Score</option>
            <option value="Value">Deal Value</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 border-b border-gray-800">
              {COLS.map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead, i) => {
              const score = calculateLeadScore(lead)
              return (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${(() => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const isOverdue = lead.followUpDate && new Date(lead.followUpDate) <= today && lead.status !== 'Cold'
                    return isOverdue
                      ? 'bg-red-500/5 border-l-2 border-l-red-500'
                      : i % 2 === 0 ? 'bg-gray-900/30' : 'bg-transparent'
                  })()}
                  `}
                >
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{lead.num}</td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{lead.company}</p>
                    <p className="text-gray-500 text-xs">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{lead.contact}</p>
                    <p className="text-gray-500 text-xs">{lead.title}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{lead.niche}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColors[lead.status] || 'text-gray-400'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded border text-xs ${getScoreBadgeClass(score)}`}>
                      {score}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${stageColors[lead.dealStage] || 'text-gray-400'}`}>
                    {lead.dealStage}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{lead.city}, {lead.state}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{lead.lastSender || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-mono ${lead.followUpCount > 2 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {lead.followUpCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {lead.dealValue > 0
                      ? <span className="text-orange-400 font-medium">${lead.dealValue}</span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-10 text-center text-gray-500">
                  No leads match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <p className="text-gray-600 text-xs mt-3">{filtered.length} of {leads.length} leads shown</p>

    </div>
  )
}

function LoadingScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 gap-4">
      <div className="w-10 h-10 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 gap-3">
      <p className="text-4xl">⚠️</p>
      <p className="text-red-400 text-sm font-medium">Failed to load data</p>
      <p className="text-gray-600 text-xs max-w-xs text-center">{message}</p>
    </div>
  )
}