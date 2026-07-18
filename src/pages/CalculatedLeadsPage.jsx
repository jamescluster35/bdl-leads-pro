import { useState } from 'react'
import { useLeadsStore } from '../store/leadsStore'

const COLS = ['Date / ID', 'Company & Website', 'Contact Detail', 'Niche', 'Leakage (Mo)', 'Rating / Reviews', 'Status', 'Analyst Notes', 'Actions']

const NICHE_ICONS = {
  dental: '🦷',
  realestate: '🏠',
  healthcare: '🏥',
  legal: '⚖️',
  saas: '💻',
  restaurant: '🍽️',
  general: '🏢',
}

export default function CalculatedLeadsPage() {
  const { calculatedLeads, updateCalculatorLead, deleteCalculatorLead, ingestCalculatorLead, loading, error } = useLeadsStore()
  const [search, setSearch] = useState('')
  const [filterContacted, setFilterContacted] = useState('All')
  const [editingNotesLead, setEditingNotesLead] = useState(null)
  const [notesTemp, setNotesTemp] = useState('')
  const [ingestLoadingId, setIngestLoadingId] = useState(null)

  const filtered = calculatedLeads.filter(l => {
    const matchSearch = search === '' ||
      String(l.business || '').toLowerCase().includes(search.toLowerCase()) ||
      String(l.name || '').toLowerCase().includes(search.toLowerCase()) ||
      String(l.email || '').toLowerCase().includes(search.toLowerCase()) ||
      String(l.niche || '').toLowerCase().includes(search.toLowerCase())
    
    let matchContacted = true
    if (filterContacted === 'Contacted') {
      matchContacted = l.contacted === 'Yes' || l.contacted === 'Ingested'
    } else if (filterContacted === 'Ingested') {
      matchContacted = l.contacted === 'Ingested'
    } else if (filterContacted === 'Pending') {
      matchContacted = !l.contacted || l.contacted === 'No' || l.contacted === ''
    }
    
    return matchSearch && matchContacted
  })

  // Calculations for KPI Cards
  const totalSubmissions = calculatedLeads.length
  const totalLeakage = calculatedLeads.reduce((acc, curr) => acc + Number(curr.totalLeakage || 0), 0)
  const totalAnnualized = calculatedLeads.reduce((acc, curr) => acc + Number(curr.annualLeakage || 0), 0)
  const ingestedCount = calculatedLeads.filter(l => l.contacted === 'Ingested').length

  const handleExportCSV = () => {
    if (filtered.length === 0) return
    const csvHeaders = ['id', 'date', 'name', 'email', 'phone', 'business', 'niche', 'monthlyRevenue', 'googleRating', 'googleReviews', 'totalLeakage', 'annualLeakage', 'contacted', 'paidReport', 'notes']
    const csvRows = filtered.map(l =>
      csvHeaders.map(h => {
        const val = l[h] ?? ''
        const str = String(val).replace(/"/g, '""')
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
      }).join(',')
    )
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bdl-calculated-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleToggleContacted = (lead) => {
    if (lead.contacted === 'Ingested') return // Locked
    const nextStatus = (lead.contacted === 'Yes') ? 'No' : 'Yes'
    updateCalculatorLead(lead.id || lead.email, { contacted: nextStatus })
  }

  const handleTogglePaidReport = (lead) => {
    const nextStatus = (lead.paidReport === 'Paid') ? 'No' : 'Paid'
    updateCalculatorLead(lead.id || lead.email, { paidReport: nextStatus })
  }

  const handleOpenNotes = (lead) => {
    setEditingNotesLead(lead)
    setNotesTemp(lead.notes || '')
  }

  const handleSaveNotes = async () => {
    if (!editingNotesLead) return
    await updateCalculatorLead(editingNotesLead.id || editingNotesLead.email, { notes: notesTemp })
    setEditingNotesLead(null)
  }

  const handleIngest = async (lead) => {
    const leadId = lead.id || lead.email
    setIngestLoadingId(leadId)
    const result = await ingestCalculatorLead(lead)
    setIngestLoadingId(null)
    if (result.success) {
      alert(`Successfully ingested "${lead.business || 'Lead'}" into Campaign Leads (Outbound)!`)
    } else {
      alert(`Failed to ingest lead: ${result.error}`)
    }
  }

  const handleDelete = async (lead) => {
    if (window.confirm(`Are you sure you want to delete the submission for "${lead.business || 'this lead'}"?`)) {
      await deleteCalculatorLead(lead.id || lead.email)
    }
  }

  if (loading && calculatedLeads.length === 0) return <LoadingScreen message="Loading calculator submissions..." />
  if (error) return <ErrorScreen message={error} />

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="text-orange-500">🧮</span> Calculated Leads (Inbound)
          </h1>
          <p className="text-gray-400 text-xs mt-1 bg-orange-500/5 border border-orange-500/10 px-3 py-2 rounded-lg leading-relaxed max-w-2xl">
            <strong>📥 INBOUND STEP:</strong> Review leads who filled out the calculator on the live site. Verify their monthly leakage estimate, and click the <strong>Ingest 🚀</strong> button to promote them directly to your active Campaign Leads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* KPI stats section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Total Submissions</p>
          <p className="text-2xl font-bold text-white mt-1">{totalSubmissions}</p>
        </div>
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Identified Leakage / Mo</p>
          <p className="text-2xl font-bold text-red-400 mt-1">${Math.round(totalLeakage).toLocaleString()}</p>
        </div>
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Annual Impact</p>
          <p className="text-2xl font-bold text-gray-200 mt-1">${Math.round(totalAnnualized).toLocaleString()}</p>
        </div>
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Ingested Outbound</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {ingestedCount} <span className="text-xs text-gray-500 font-normal">({totalSubmissions > 0 ? Math.round((ingestedCount / totalSubmissions) * 100) : 0}%)</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search by business, email, contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 w-full sm:w-80 placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
        {[
          { key: 'All', label: 'All Submissions' },
          { key: 'Pending', label: 'Pending Outreach' },
          { key: 'Contacted', label: 'Contacted' },
          { key: 'Ingested', label: 'Ingested to Outbound' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilterContacted(opt.key)}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
              filterContacted === opt.key
                ? 'bg-orange-600 border-orange-600 text-white font-medium'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table view */}
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
            {filtered.map((lead, i) => {
              const formattedDate = lead.date ? new Date(lead.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
              const leakageVal = Number(lead.totalLeakage || 0)
              const annualVal = Number(lead.annualLeakage || 0)
              const niche = (lead.niche || 'general').toLowerCase()
              const nicheIcon = NICHE_ICONS[niche] || '🏢'
              
              return (
                <tr
                  key={lead.id || lead.email}
                  className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${
                    lead.contacted === 'Ingested' ? 'bg-green-950/5' : i % 2 === 0 ? 'bg-gray-900/30' : 'bg-transparent'
                  }`}
                >
                  {/* Date & ID */}
                  <td className="px-4 py-3">
                    <p className="text-white text-xs font-semibold">{formattedDate}</p>
                    <p className="text-gray-500 text-[10px] font-mono mt-0.5">{lead.id || 'BDL-DRAFT'}</p>
                  </td>

                  {/* Company & website */}
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{lead.business || '—'}</p>
                    {lead.website ? (
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `http://${lead.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 hover:text-orange-300 text-xs hover:underline block"
                      >
                        {lead.website}
                      </a>
                    ) : (
                      <span className="text-gray-500 text-xs">—</span>
                    )}
                  </td>

                  {/* Contact detail */}
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{lead.name || '—'}</p>
                    <p className="text-gray-500 text-xs">{lead.email}</p>
                    {lead.phone && <p className="text-gray-500 text-xs font-mono">{lead.phone}</p>}
                  </td>

                  {/* Niche styled badge */}
                  <td className="px-4 py-3">
                    <span className="bg-orange-500/10 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                      <span>{nicheIcon}</span>
                      <span className="capitalize">{lead.niche || 'General'}</span>
                    </span>
                  </td>

                  {/* Estimated Leakage */}
                  <td className="px-4 py-3">
                    <p className="text-red-400 font-semibold font-mono">${Math.round(leakageVal).toLocaleString()}</p>
                    <p className="text-gray-500 text-[11px] font-mono mt-0.5">${Math.round(annualVal).toLocaleString()}/yr</p>
                  </td>

                  {/* Rating & reviews */}
                  <td className="px-4 py-3">
                    {lead.googleRating ? (
                      <div>
                        <p className="text-yellow-400 font-semibold text-xs">{lead.googleRating} ★</p>
                        <p className="text-gray-500 text-[11px] font-mono mt-0.5">{lead.googleReviews} reviews</p>
                      </div>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>

                  {/* Inline Status Toggle Toggles */}
                  <td className="px-4 py-3 text-xs space-y-1.5">
                    {/* Contacted state toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleContacted(lead)}
                        disabled={lead.contacted === 'Ingested'}
                        className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
                          lead.contacted === 'Ingested'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 cursor-not-allowed'
                            : lead.contacted === 'Yes'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {lead.contacted === 'Ingested' ? '✓ Ingested' : lead.contacted === 'Yes' ? '✓ Contacted' : '○ Contacted?'}
                      </button>
                    </div>

                    {/* Paid report toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePaidReport(lead)}
                        className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
                          lead.paidReport === 'Paid'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {lead.paidReport === 'Paid' ? '💳 Paid Report' : '○ Unpaid'}
                      </button>
                    </div>
                  </td>

                  {/* Notes content */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex items-start gap-1">
                      <p className="text-xs text-gray-400 line-clamp-2 truncate">{lead.notes || <span className="text-gray-600 italic">No notes...</span>}</p>
                      <button
                        onClick={() => handleOpenNotes(lead)}
                        className="text-[11px] text-orange-400 hover:text-orange-300 font-medium ml-auto flex-shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  </td>

                  {/* Dynamic Action Ingest Button */}
                  <td className="px-4 py-3 space-x-2">
                    <div className="flex items-center gap-2">
                      {lead.contacted === 'Ingested' ? (
                        <span className="text-xs text-green-400 font-semibold px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
                          Ingested
                        </span>
                      ) : (
                        <button
                          onClick={() => handleIngest(lead)}
                          disabled={ingestLoadingId === (lead.id || lead.email)}
                          className="bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs px-2.5 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                          {ingestLoadingId === (lead.id || lead.email) ? 'Ingesting...' : '⚡ Ingest'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(lead)}
                        className="text-gray-500 hover:text-red-400 p-1 text-xs transition-colors"
                        title="Delete Submision"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-10 text-center text-gray-500">
                  No submissions match your current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog Notes Editor Modal */}
      {editingNotesLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingNotesLead(null)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-white font-semibold text-base mb-3">Edit Lead Notes</h3>
            <p className="text-xs text-gray-500 mb-2">{editingNotesLead.business || 'Business Details'}</p>
            <textarea
              value={notesTemp}
              onChange={e => setNotesTemp(e.target.value)}
              placeholder="Add follow-up notes, special requests, Wise invoice links..."
              className="w-full bg-gray-800 border border-gray-700 text-gray-150 text-sm rounded-lg px-3 py-2 h-32 placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingNotesLead(null)}
                className="border border-gray-700 text-gray-400 hover:text-white rounded-lg px-4 py-2 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
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
      <p className="text-red-400 text-sm font-medium">Failed to load submissions</p>
      <p className="text-gray-600 text-xs max-w-xs text-center">{message}</p>
    </div>
  )
}
