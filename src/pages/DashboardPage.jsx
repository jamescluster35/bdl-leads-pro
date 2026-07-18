import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { useLeadsStore } from '../store/leadsStore'

const COLORS = ['#F97316','#FB923C','#EA580C','#0EA5E9','#8B5CF6','#F59E0B']

function standardizeDate(dateVal) {
  if (!dateVal) return null
  const str = String(dateVal).trim()
  
  // 1. Check for YYYY-MM-DD
  let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (match) {
    const yyyy = match[1]
    const mm = match[2].padStart(2, '0')
    const dd = match[3].padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  
  // 2. Check for MM/DD/YYYY or M/D/YYYY
  match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (match) {
    const mm = match[1].padStart(2, '0')
    const dd = match[2].padStart(2, '0')
    const yyyy = match[3]
    return `${yyyy}-${mm}-${dd}`
  }
  
  // 3. Fallback to native Date parsing
  try {
    const d = new Date(str)
    if (isNaN(d.getTime())) return null
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch (e) {
    return null
  }
}

export default function DashboardPage() {
  const { leads, clients, archived, deleted, lost: lostLeads, queueStats, loading, error, forceRefresh } = useLeadsStore()
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Auto-refresh every 5 minutes to keep charts current after sync_crm.py runs
  useEffect(() => {
    const timer = setInterval(() => {
      forceRefresh().then(() => setLastRefresh(new Date()))
    }, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await forceRefresh()
    setLastRefresh(new Date())
    setRefreshing(false)
  }

  // Don't block render — show cached data immediately, show sync badge while refreshing
  const hasData = leads.length > 0 || clients.length > 0 || archived.length > 0

  if (loading && !hasData) return (
    <div className="flex items-center justify-center h-full min-h-96 gap-3">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading dashboard...</p>
    </div>
  )

  if (error && !hasData) return (
    <div className="flex items-center justify-center h-full min-h-96">
      <p className="text-red-400 text-sm">Error: {error}</p>
    </div>
  )

  // Include leads, archived, lost and clients to get complete dispatch history
  const allLeads = [...leads, ...archived, ...(lostLeads || []), ...clients]
  const lostCount = (lostLeads || []).length

  // ── Core stats ───────────────────────────────────────
  const total    = leads.length
  const newLeads = leads.filter(l => l.status === 'New').length
  const pitched  = leads.filter(l => l.status === 'Pitched').length
  const warm     = leads.filter(l => l.status === 'Warm').length
  const cold     = leads.filter(l => l.status === 'Cold').length
  const revenue  = clients.reduce((sum, c) => sum + (parseFloat(c.dealValue) || 0), 0)

  // Campaign metrics
  const totalSent   = allLeads.filter(l => l.pitchSent).length
  const bounceCount = (deleted || []).length
  const totalDispatched = totalSent + bounceCount
  const bounceRate  = totalDispatched > 0 ? Math.round((bounceCount / totalDispatched) * 100) : 0
  const replyRate   = totalSent > 0 ? Math.round((warm / totalSent) * 100) : 0

  const today = new Date()
  today.setHours(0,0,0,0)
  const overdueCount = leads.filter(l =>
    l.followUpDate && new Date(l.followUpDate) <= today &&
    l.status !== 'Cold' && l.status !== 'Pitched'
  ).length

  // ── Local Queues ─────────────────────────────────────
  const pendingQueues = queueStats || {}
  const totalPending = Object.values(pendingQueues).reduce((sum, count) => sum + count, 0)

  // ── Sender performance ───────────────────────────────
  const senderMap = {}
  allLeads.forEach(l => {
    if (!l.lastSender) return
    if (!senderMap[l.lastSender]) {
      senderMap[l.lastSender] = {
        name: l.lastSender, short: l.lastSender.split(' ')[0],
        leads: 0, warm: 0, pitched: 0, closed: 0, revenue: 0,
      }
    }
    senderMap[l.lastSender].leads++
    if (l.status === 'Warm')                      senderMap[l.lastSender].warm++
    if (l.status === 'Pitched' || l.pitchSent)    senderMap[l.lastSender].pitched++
    if (l.dealStage === 'Closed')                 senderMap[l.lastSender].closed++
  })
  clients.forEach(c => {
    if (!c.lastSender) return
    if (!senderMap[c.lastSender]) {
      senderMap[c.lastSender] = { name: c.lastSender, short: c.lastSender.split(' ')[0], leads: 0, warm: 0, pitched: 0, closed: 0, revenue: 0 }
    }
    senderMap[c.lastSender].revenue += parseFloat(c.dealValue) || 0
    senderMap[c.lastSender].closed++
  })
  const senderData = Object.values(senderMap).sort((a, b) => b.leads - a.leads)

  // ── Daily Sent & Bounced Volume (Last 7 active days of dispatches) ──
  const dailySentMap = {}
  allLeads.forEach(l => {
    const dateStr = standardizeDate(l.lastContacted)
    if (dateStr) {
      dailySentMap[dateStr] = (dailySentMap[dateStr] || 0) + 1
    }
  })

  const dailyBouncesMap = {}
  if (deleted && Array.isArray(deleted)) {
    deleted.forEach(l => {
      const dateStr = standardizeDate(l.lastContacted)
      if (dateStr) {
        dailyBouncesMap[dateStr] = (dailyBouncesMap[dateStr] || 0) + 1
      }
    })
  }

  const allVolumeDates = new Set([...Object.keys(dailySentMap), ...Object.keys(dailyBouncesMap)])
  const dailyVolumeData = Array.from(allVolumeDates)
    .map(date => {
      let displayDate = date
      try {
        const d = new Date(date)
        if (!isNaN(d.getTime())) {
          displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        }
      } catch (e) {}
      const sent = dailySentMap[date] || 0
      const bounces = dailyBouncesMap[date] || 0
      return {
        rawDate: date,
        name: displayDate,
        sent,
        bounces,
        total: sent + bounces
      }
    })
    .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
    .slice(-7)

  // ── Niche performance breakdown ───────────────────────
  const nichePerformanceMap = {}
  const knownNiches = ['restaurant', 'legal', 'dental', 'lodging', 'realestate']
  knownNiches.forEach(n => {
    nichePerformanceMap[n] = { name: n, leads: 0, pitched: 0, warm: 0, closed: 0, revenue: 0 }
  })
  
  allLeads.forEach(l => {
    const n = (l.niche || 'other').toLowerCase()
    if (!nichePerformanceMap[n]) {
      nichePerformanceMap[n] = { name: n, leads: 0, pitched: 0, warm: 0, closed: 0, revenue: 0 }
    }
    nichePerformanceMap[n].leads++
    if (l.status === 'Pitched' || l.pitchSent)    nichePerformanceMap[n].pitched++
    if (l.status === 'Warm')                      nichePerformanceMap[n].warm++
    if (l.dealStage === 'Closed')                 nichePerformanceMap[n].closed++
  })
  
  clients.forEach(c => {
    const n = (c.niche || 'other').toLowerCase()
    if (!nichePerformanceMap[n]) {
      nichePerformanceMap[n] = { name: n, leads: 0, pitched: 0, warm: 0, closed: 0, revenue: 0 }
    }
    nichePerformanceMap[n].revenue += parseFloat(c.dealValue) || 0
    nichePerformanceMap[n].closed++
  })
  
  const nichePerformanceData = Object.values(nichePerformanceMap)
    .map(n => {
      const replyRate = n.pitched > 0 ? Math.round((n.warm / n.pitched) * 100) : 0
      return { ...n, replyRate }
    })
    .sort((a, b) => b.leads - a.leads)

  // ── Niche breakdown (simple chart data) ───────────────
  const nicheData = nichePerformanceData.map(n => ({ name: n.name, count: n.leads })).filter(n => n.count > 0)

  // ── Deal Stage pipeline funnel ────────────────────────
  const stageOrder = ['New', 'Pitched', 'Negotiating', 'Closed', 'Cold']
  const stageData  = stageOrder.map(stage => ({
    name: stage, count: leads.filter(l => l.dealStage === stage).length
  })).filter(s => s.count > 0)
  const STAGE_COLORS = { New: '#6B7280', Pitched: '#3B82F6', Negotiating: '#F59E0B', Closed: '#F97316', Cold: '#374151' }

  // ── Status funnel (campaign health) ──────────────────
  const statusFunnel = [
    { name: 'New',     count: newLeads, color: '#EAB308' },
    { name: 'Pitched', count: pitched,  color: '#3B82F6' },
    { name: 'Warm',    count: warm,     color: '#F97316' },
    { name: 'Cold',    count: cold,     color: '#6B7280' },
  ].filter(s => s.count > 0)

  // ── Conversion rates ─────────────────────────────────
  const totalAll     = allLeads.length + clients.length
  const convRate     = totalAll > 0 ? Math.round((clients.length / totalAll) * 100) : 0
  const pitchToClose = totalSent > 0 ? Math.round((clients.length / totalSent) * 100) : 0

  return (
    <div className="p-4 md:p-6 w-full">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Full pipeline overview — BDL Leads Pro</p>
          <p className="text-gray-600 text-xs mt-1">Last synced: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-orange-400 text-xs font-medium">Syncing...</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium hover:bg-orange-500/20 transition-all disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Row 1 — Pipeline snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Leads"    value={total}    sub="active pipeline"      color="text-white" />
        <StatCard label="Pitched"        value={pitched}  sub="email sent, no reply" color="text-blue-400" />
        <StatCard label="Warm Replies"   value={warm}     sub="genuine interest"      color="text-orange-400" />
        <StatCard label="Follow Ups Due" value={overdueCount} sub="need attention"    color="text-red-400" />
      </div>

      {/* Row 2 — Campaign health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Emails Sent"   value={totalDispatched}        sub="total dispatched"         color="text-blue-400" />
        <StatCard label="Bounce Rate"   value={`${bounceRate}%`}       sub={`${bounceCount} bounced`} color={bounceRate > 10 ? 'text-red-400' : 'text-green-400'} />
        <StatCard label="Reply Rate"    value={`${replyRate}%`}        sub={`${warm} warm replies`}   color="text-orange-400" />
        <StatCard label="Not Contacted" value={newLeads}               sub="still New"                color="text-yellow-400" />
      </div>

      {/* Row 3 — Business metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Clients"   value={clients.length}                sub="paying customers"    color="text-orange-400" big />
        <StatCard label="Total Revenue"   value={`$${revenue.toLocaleString()}`} sub="from closed deals"  color="text-orange-400" big />
        <StatCard label="Conversion Rate" value={`${convRate}%`}                sub="leads → clients"     color="text-purple-400" big />
        <StatCard label="Lost Deals"      value={lostCount}                      sub="not won"             color="text-red-400" big />
      </div>

      {/* Local Desktop Queues Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-white font-semibold text-sm">Local Desktop Queues</p>
          <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-medium">
            {totalPending} Total Pending
          </span>
        </div>
        <p className="text-gray-500 text-xs mb-4">Emails waiting to be pitched on your local BDL Control Panel</p>
        
        {Object.keys(pendingQueues).length === 0 ? (
          <p className="text-gray-600 text-sm py-4 text-center">No queue data synced yet. Run a CRM sync locally.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(pendingQueues).map(([niche, count]) => {
              const colors = {
                restaurant: { bg: 'bg-orange-500/10', bar: 'bg-orange-500', text: 'text-orange-400' },
                legal: { bg: 'bg-blue-500/10', bar: 'bg-blue-500', text: 'text-blue-400' },
                dental: { bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', text: 'text-emerald-400' },
                lodging: { bg: 'bg-purple-500/10', bar: 'bg-purple-500', text: 'text-purple-400' },
                realestate: { bg: 'bg-amber-500/10', bar: 'bg-amber-500', text: 'text-amber-400' },
              }
              const color = colors[niche] || { bg: 'bg-gray-500/10', bar: 'bg-gray-500', text: 'text-gray-400' }
              return (
                <div key={niche} className="bg-gray-950/40 border border-gray-800/80 rounded-lg p-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-gray-400 font-medium capitalize">{niche}</span>
                    <p className={`text-lg font-bold mt-1 ${color.text}`}>{count}</p>
                  </div>
                  <div className="w-full bg-gray-850 h-1.5 rounded-full overflow-hidden mt-3">
                    <div 
                      className={`h-full ${color.bar}`} 
                      style={{ width: `${Math.min(100, (count / Math.max(1, totalPending)) * 100)}%` }} 
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sender Performance Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <p className="text-white font-semibold text-sm mb-0.5">Sender Performance</p>
        <p className="text-gray-500 text-xs mb-4">Who's sending the most and converting the best</p>
        {senderData.length === 0 ? (
          <p className="text-gray-600 text-sm py-4 text-center">No sender data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Sender', 'Leads', 'Pitched', 'Warm', 'Closed', 'Revenue', 'Close Rate'].map(h => (
                    <th key={h} className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {senderData.map((s, i) => (
                  <tr key={s.name} className="border-b border-gray-800/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: COLORS[i % COLORS.length] }}>
                          {s.short[0]}
                        </div>
                        <span className="text-gray-200 text-xs">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-300 text-xs">{s.leads}</td>
                    <td className="py-3 pr-4 text-blue-400 text-xs">{s.pitched}</td>
                    <td className="py-3 pr-4 text-orange-400 text-xs">{s.warm}</td>
                    <td className="py-3 pr-4 text-orange-400 text-xs font-medium">{s.closed}</td>
                    <td className="py-3 pr-4 text-orange-400 text-xs font-semibold">
                      {s.revenue > 0 ? `$${s.revenue.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5 w-16">
                          <div className="h-full rounded-full bg-orange-500" style={{ width: `${s.leads > 0 ? Math.round((s.closed / s.leads) * 100) : 0}%` }} />
                        </div>
                        <span className="text-gray-500 text-xs">{s.leads > 0 ? Math.round((s.closed / s.leads) * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Niche Performance Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <p className="text-white font-semibold text-sm mb-0.5">Niche Performance</p>
        <p className="text-gray-500 text-xs mb-4">Which industry campaign is delivering the highest response and revenue</p>
        {nichePerformanceData.length === 0 ? (
          <p className="text-gray-600 text-sm py-4 text-center">No niche data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Niche', 'Total Leads', 'Pitched', 'Warm Replies', 'Closed Deals', 'Revenue', 'Reply Rate'].map(h => (
                    <th key={h} className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nichePerformanceData.map((n, i) => (
                  <tr key={n.name} className="border-b border-gray-800/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-200 text-xs capitalize">{n.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-300 text-xs">{n.leads}</td>
                    <td className="py-3 pr-4 text-blue-400 text-xs">{n.pitched}</td>
                    <td className="py-3 pr-4 text-orange-400 text-xs">{n.warm}</td>
                    <td className="py-3 pr-4 text-orange-400 text-xs font-medium">{n.closed}</td>
                    <td className="py-3 pr-4 text-orange-400 text-xs font-semibold">
                      {n.revenue > 0 ? `$${n.revenue.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5 w-16">
                          <div className="h-full rounded-full bg-orange-500" style={{ width: `${n.replyRate}%` }} />
                        </div>
                        <span className="text-gray-500 text-xs">{n.replyRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Leads by Sender" sub="Distribution across senders">
          {senderData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={senderData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="short" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="leads" radius={[6,6,0,0]} name="Leads">
                  {senderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Revenue by Sender" sub="Who's generating the most revenue">
          {senderData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={senderData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="short" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="revenue" radius={[6,6,0,0]} name="Revenue ($)">
                  {senderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Status Breakdown + Pipeline Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Status Breakdown" sub="Campaign outreach health — where are your leads?">
          {statusFunnel.length === 0 ? <Empty /> : (
            <div className="flex flex-col gap-2.5 py-2">
              {statusFunnel.map(s => {
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 text-right">{s.name}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                      <div className="h-full rounded-full flex items-center px-3 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 6)}%`, background: s.color }}>
                        <span className="text-xs text-white font-medium">{s.count}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-8">{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Pipeline Funnel" sub="Lead distribution across deal stages">
          {stageData.length === 0 ? <Empty /> : (
            <div className="flex flex-col gap-2 py-2">
              {stageData.map(s => {
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 text-right">{s.name}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                      <div className="h-full rounded-full flex items-center px-3 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 8)}%`, background: STAGE_COLORS[s.name] || '#6B7280' }}>
                        <span className="text-xs text-white font-medium">{s.count}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-8">{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Niche + Daily Sent Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Leads by Niche" sub="Which niches you're targeting">
          {nicheData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={nicheData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[6,6,0,0]} name="Leads">
                  {nicheData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Daily Email Volume" sub="Number of dispatches and bounces over the last 7 active days">
          {dailyVolumeData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyVolumeData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="sent" stackId="a" fill="#F97316" name="Pitched" radius={[0,0,0,0]} />
                <Bar dataKey="bounces" stackId="a" fill="#EF4444" name="Bounces" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Campaign Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Campaign Summary" sub="Key numbers at a glance">
          <div className="flex flex-col gap-3 py-2">
            {[
              { label: 'Emails Dispatched', value: totalSent,                           color: 'text-blue-400' },
              { label: 'Bounced',           value: `${bounceCount} (${bounceRate}%)`,   color: bounceRate > 10 ? 'text-red-400' : 'text-green-400' },
              { label: 'Warm Replies',      value: `${warm} (${replyRate}%)`,           color: 'text-orange-400' },
              { label: 'Lost Deals',        value: lostCount,                           color: 'text-red-400' },
              { label: 'Clients Closed',    value: clients.length,                      color: 'text-orange-400' },
              { label: 'Revenue Tracked',   value: `$${revenue.toLocaleString()}`,      color: 'text-orange-400' },
              { label: 'Pitch → Close',     value: `${pitchToClose}%`,                 color: 'text-purple-400' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center border-b border-gray-800/60 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-500 text-xs">{r.label}</span>
                <span className={`text-sm font-semibold ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────
function StatCard({ label, value, sub, color, big }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${big ? 'py-5' : ''}`}>
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-bold ${big ? 'text-3xl' : 'text-2xl'} ${color}`}>{value}</p>
      <p className="text-gray-600 text-xs mt-1">{sub}</p>
    </div>
  )
}

function ChartCard({ title, sub, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-white font-semibold text-sm mb-0.5">{title}</p>
      <p className="text-gray-500 text-xs mb-4">{sub}</p>
      {children}
    </div>
  )
}

function Empty() {
  return <p className="text-gray-600 text-sm py-8 text-center">No data yet — add more leads.</p>
}