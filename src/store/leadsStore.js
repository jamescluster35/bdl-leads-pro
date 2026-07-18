import { create } from 'zustand'
import { sheetsApi } from '../lib/sheetsApi'

const STATUS_COLORS = {
  Warm:    'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Pitched: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Cold:    'bg-gray-500/20 text-gray-400 border-gray-500/30',
  New:     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Lost:    'bg-red-500/20 text-red-400 border-red-500/30',
}

const STAGE_COLORS = {
  New:         'text-gray-400',
  Pitched:     'text-blue-400',
  Negotiating: 'text-orange-400',
  Closed:      'text-orange-500',
  Cold:        'text-gray-500',
}

// Helper to save cache to localStorage safely
function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.warn("Failed to save cache for " + key + ":", err)
  }
}

// Helper to normalize lead statuses to title case (Cold, New, Pitched, Warm, Lost)
function normalizeLead(lead) {
  if (!lead) return lead
  let s = String(lead.status || '').trim()
  if (s) {
    s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  } else {
    s = 'New'
  }
  return { ...lead, status: s }
}

export const useLeadsStore = create((set, get) => ({
  leads:           [],
  archived:        [],
  deleted:         [],
  clients:         [],
  lost:            [],
  senders:         [],
  calculatedLeads: [],
  queueStats:      {},
  loading:         false,
  error:           null,
  statusColors:    STATUS_COLORS,
  stageColors:     STAGE_COLORS,

  // ── Load all data from Google Sheets ──────────────
  loadAll: async () => {
    // 1. Try to load from localStorage cache first for 0ms load time
    let cachedLeads = []
    let cachedArchived = []
    let cachedDeleted = []
    let cachedClients = []
    let cachedSenders = []
    let cachedCalcLeads = []
    let cachedQueueStats = {}
    let hasCache = false

    try {
      const cLeads = localStorage.getItem('bdl_cache_leads')
      const cArchived = localStorage.getItem('bdl_cache_archived')
      const cDeleted = localStorage.getItem('bdl_cache_deleted')
      const cClients = localStorage.getItem('bdl_cache_clients')
      const cLost = localStorage.getItem('bdl_cache_lost')
      const cSenders = localStorage.getItem('bdl_cache_senders')
      const cCalc = localStorage.getItem('bdl_cache_calculatedLeads')
      const cQueue = localStorage.getItem('bdl_cache_queueStats')

      if (cLeads) {
        cachedLeads = JSON.parse(cLeads).map(normalizeLead)
        cachedArchived = cArchived ? JSON.parse(cArchived).map(normalizeLead) : []
        cachedDeleted = cDeleted ? JSON.parse(cDeleted).map(normalizeLead) : []
        cachedClients = cClients ? JSON.parse(cClients).map(normalizeLead) : []
        cachedSenders = cSenders ? JSON.parse(cSenders) : []
        cachedCalcLeads = cCalc ? JSON.parse(cCalc) : []
        cachedQueueStats = cQueue ? JSON.parse(cQueue) : {}
        hasCache = true
      }
    } catch (e) {
      console.warn("Failed to read localStorage cache:", e)
    }

    if (hasCache) {
      set({
        leads:           cachedLeads,
        archived:        cachedArchived,
        deleted:         cachedDeleted,
        clients:         cachedClients,
        lost:            JSON.parse(localStorage.getItem('bdl_cache_lost') || '[]').map(normalizeLead),
        senders:         cachedSenders,
        calculatedLeads: cachedCalcLeads,
        queueStats:      cachedQueueStats,
        loading:         false,
        error:           null
      })
    } else {
      set({ loading: true, error: null })
    }

    // 2. Fire ALL 3 requests in parallel — no more sequential waiting
    const [allResult, sendersResult, calcResult] = await Promise.allSettled([
      sheetsApi.getAll(),
      sheetsApi.getSenders(),
      sheetsApi.getCalculatorLeads(),
    ])

    const allData     = allResult.status     === 'fulfilled' ? allResult.value     : null
    const sendersData = sendersResult.status === 'fulfilled' ? sendersResult.value : null
    const calcData    = calcResult.status    === 'fulfilled' ? calcResult.value    : null

    if (allData && allData.error) {
      if (!hasCache) set({ error: allData.error, loading: false })
      return
    }

    if (!allData) {
      if (!hasCache) set({ error: 'Failed to load data. Check connection.', loading: false })
      return
    }

    const sendersList = sendersData?.senders || []
    const calcLeads   = calcData?.leads      || []

    const normalizedLeads = (allData.leads || []).map(normalizeLead)
    const normalizedArchived = (allData.archived || []).map(normalizeLead)
    const normalizedDeleted = (allData.deleted || []).map(normalizeLead)
    const normalizedClients = (allData.clients || []).map(normalizeLead)
    const normalizedLost = (allData.lost || []).map(normalizeLead)

    set({
      leads:           normalizedLeads,
      archived:        normalizedArchived,
      deleted:         normalizedDeleted,
      clients:         normalizedClients,
      lost:            normalizedLost,
      senders:         sendersList,
      calculatedLeads: calcLeads,
      queueStats:      allData.queueStats || {},
      loading:         false,
    })

    // Write fresh values to cache
    saveCache('bdl_cache_leads',           normalizedLeads)
    saveCache('bdl_cache_archived',        normalizedArchived)
    saveCache('bdl_cache_deleted',         normalizedDeleted)
    saveCache('bdl_cache_clients',         normalizedClients)
    saveCache('bdl_cache_lost',            normalizedLost)
    saveCache('bdl_cache_senders',         sendersList)
    saveCache('bdl_cache_calculatedLeads', calcLeads)
    saveCache('bdl_cache_queueStats',      allData.queueStats || {})
  },

  // ── Force full refresh (clears cache, re-fetches from API) ──
  forceRefresh: async () => {
    const cacheKeys = [
      'bdl_cache_leads','bdl_cache_archived','bdl_cache_deleted',
      'bdl_cache_clients','bdl_cache_lost','bdl_cache_senders',
      'bdl_cache_calculatedLeads','bdl_cache_queueStats'
    ]
    cacheKeys.forEach(k => { try { localStorage.removeItem(k) } catch(e){} })
    await get().loadAll()
  },

  // ── Save Senders ───────────────────────────────────
  saveSenders: async (sendersList) => {
    set({ loading: true, error: null })
    try {
      const res = await sheetsApi.saveSenders(sendersList)
      if (res.error) throw new Error(res.error)
      set({ senders: sendersList, loading: false })
      saveCache('bdl_cache_senders', sendersList)
      return { success: true }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { error: err.message }
    }
  },

  // ── Add new lead ───────────────────────────────────
  addLead: async (lead) => {
    const newLead = {
      ...lead,
      id: Date.now().toString(),
      num: (get().leads.length + 1),
      followUpCount: 0,
      lastContacted: '',
      outreachLog: [],
    }
    const updatedLeads = [...get().leads, newLead]
    set({ leads: updatedLeads })
    saveCache('bdl_cache_leads', updatedLeads)
    try {
      await sheetsApi.addLead(newLead)
    } catch (err) {
      const rolledBack = get().leads.filter(l => l.id !== newLead.id)
      set({ leads: rolledBack })
      saveCache('bdl_cache_leads', rolledBack)
    }
  },

  // ── Update lead ────────────────────────────────────
  updateLead: async (id, changes, tab = 'Leads') => {
    const tabKey = tab.toLowerCase()
    const updatedList = get()[tabKey].map(l => l.id === id ? { ...l, ...changes } : l)
    set({ [tabKey]: updatedList })
    saveCache('bdl_cache_' + tabKey, updatedList)
    try {
      await sheetsApi.updateLead(id, changes, tab)
    } catch (err) {
      console.error('Update failed:', err)
    }
  },

  // ── Archive lead (Leads → Archived) ───────────────
  archiveLead: async (id) => {
    const lead = get().leads.find(l => l.id === id)
    if (!lead) return
    const updatedLeads = get().leads.filter(l => l.id !== id)
    const updatedArchived = [...get().archived, { ...lead, status: 'Cold' }]
    set({
      leads:    updatedLeads,
      archived: updatedArchived,
    })
    saveCache('bdl_cache_leads', updatedLeads)
    saveCache('bdl_cache_archived', updatedArchived)
    try {
      await sheetsApi.archiveLead(id)
    } catch (err) {
      console.error('Archive failed:', err)
    }
  },

  // ── Promote to client (Leads → Clients) ───────────
  promoteClient: async (id) => {
    const lead = get().leads.find(l => l.id === id)
    if (!lead) return
    const updatedLeads = get().leads.filter(l => l.id !== id)
    const updatedClients = [...get().clients, { ...lead, dealStage: 'Closed' }]
    set({
      leads:   updatedLeads,
      clients: updatedClients,
    })
    saveCache('bdl_cache_leads', updatedLeads)
    saveCache('bdl_cache_clients', updatedClients)
    try {
      await sheetsApi.promoteClient(id)
    } catch (err) {
      console.error('Promote failed:', err)
    }
  },

  // ── Restore lead (Archived/Deleted → Leads) ───────
  restoreLead: async (id, fromTab) => {
    const tabKey = fromTab.toLowerCase()
    const lead   = get()[tabKey].find(l => l.id === id)
    if (!lead) return
    const updatedSource = get()[tabKey].filter(l => l.id !== id)
    const updatedLeads = [...get().leads, { ...lead, status: 'New' }]
    set({
      [tabKey]: updatedSource,
      leads:    updatedLeads,
    })
    saveCache('bdl_cache_' + tabKey, updatedSource)
    saveCache('bdl_cache_leads', updatedLeads)
    try {
      await sheetsApi.restoreLead(id, fromTab)
    } catch (err) {
      console.error('Restore failed:', err)
    }
  },

  // ── Delete lead (any tab → Deleted) ───────────────
  deleteLead: async (id, fromTab = 'Leads') => {
    const tabKey = fromTab.toLowerCase()
    const lead   = get()[tabKey].find(l => l.id === id)
    if (!lead) return
    const updatedSource = get()[tabKey].filter(l => l.id !== id)
    const updatedDeleted = [...get().deleted, lead]
    set({
      [tabKey]: updatedSource,
      deleted:  updatedDeleted,
    })
    saveCache('bdl_cache_' + tabKey, updatedSource)
    saveCache('bdl_cache_deleted', updatedDeleted)
    try {
      await sheetsApi.deleteLead(id, fromTab)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  },

  // ── Mark as Lost (Leads → Lost tab) ───────────────
  markLost: async (id) => {
    const lead = get().leads.find(l => l.id === id)
    if (!lead) return
    const updatedLeads = get().leads.filter(l => l.id !== id)
    const updatedLost  = [...get().lost, { ...lead, status: 'Lost' }]
    set({ leads: updatedLeads, lost: updatedLost })
    saveCache('bdl_cache_leads', updatedLeads)
    saveCache('bdl_cache_lost',  updatedLost)
    try {
      await sheetsApi.markAsLost(id)
    } catch (err) {
      console.error('markLost failed:', err)
    }
  },

  // ── Restore from Lost → Leads ──────────────────────
  restoreFromLost: async (id) => {
    const lead = get().lost.find(l => l.id === id)
    if (!lead) return
    const updatedLost  = get().lost.filter(l => l.id !== id)
    const updatedLeads = [...get().leads, { ...lead, status: 'New' }]
    set({ lost: updatedLost, leads: updatedLeads })
    saveCache('bdl_cache_lost',  updatedLost)
    saveCache('bdl_cache_leads', updatedLeads)
    try {
      await sheetsApi.restoreFromLost(id)
    } catch (err) {
      console.error('restoreFromLost failed:', err)
    }
  },

  // ── Export any tab to CSV ──────────────────────────
  exportCSV: (tabName = 'leads') => {
    const data = get()[tabName]
    if (!data || data.length === 0) return

    const headers = [
      'id','num','company','contact','email','title','niche',
      'status','city','state','timezone','followUpDate',
      'lastContacted','lastSender','followUpCount','pitchSent',
      'notes','dealStage','dealValue'
    ]

    const rows = data.map(lead =>
      headers.map(h => {
        const val = lead[h] ?? ''
        const str = String(val).replace(/"/g, '""')
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str}"` : str
      }).join(',')
    )

    const csv  = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `bdl-${tabName}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },

  // ── Calculator Leads Actions ──────────────────────
  updateCalculatorLead: async (id, changes) => {
    const updatedCalc = get().calculatedLeads.map(l => (l.id === id || l.email === id) ? { ...l, ...changes } : l)
    set({ calculatedLeads: updatedCalc })
    saveCache('bdl_cache_calculatedLeads', updatedCalc)
    try {
      await sheetsApi.updateCalculatorLead(id, changes)
    } catch (err) {
      console.error('Failed to update calculator lead:', err)
    }
  },

  deleteCalculatorLead: async (id) => {
    const updatedCalc = get().calculatedLeads.filter(l => l.id !== id && l.email !== id)
    set({ calculatedLeads: updatedCalc })
    saveCache('bdl_cache_calculatedLeads', updatedCalc)
    try {
      await sheetsApi.deleteCalculatorLead(id)
    } catch (err) {
      console.error('Failed to delete calculator lead:', err)
    }
  },

  ingestCalculatorLead: async (calcLead) => {
    set({ loading: true })
    try {
      const newLead = {
        company: calcLead.business || 'New Lead',
        contact: calcLead.name || 'Unknown',
        email: calcLead.email || '',
        title: calcLead.jobTitle || 'Owner',
        niche: calcLead.niche || '',
        status: 'Warm',
        city: calcLead.city || '',
        state: calcLead.state || '',
        timezone: '',
        followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0,10),
        notes: `Ingested from Calculator. Baseline Revenue: ${calcLead.monthlyRevenue}/mo, Total Leakage: $${calcLead.totalLeakage}/mo. Breakdown: ${calcLead.leakageBreakdown || ''}`,
        dealStage: 'New',
        dealValue: Math.round(Number(calcLead.totalLeakage || 0) * 0.15) || 0,
      }
      
      await get().addLead(newLead)
      
      const updatedCalc = get().calculatedLeads.map(l => (l.id === calcLead.id || l.email === calcLead.email) ? { ...l, contacted: 'Ingested' } : l)
      set({
        calculatedLeads: updatedCalc,
        loading:         false
      })
      saveCache('bdl_cache_calculatedLeads', updatedCalc)
      await sheetsApi.updateCalculatorLead(calcLead.id || calcLead.email, { contacted: 'Ingested' })
      
      return { success: true }
    } catch (err) {
      console.error('Failed to ingest calculator lead:', err)
      set({ loading: false })
      return { error: err.message }
    }
  },

}))