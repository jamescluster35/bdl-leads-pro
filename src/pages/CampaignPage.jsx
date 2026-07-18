import { useState, useRef, useCallback, useMemo } from 'react'
import { sheetsApi } from '../lib/sheetsApi'

// ─── Email Validation ─────────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,7}$/
const JUNK_PREFIXES = ['noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'bounce', 'postmaster', 'abuse@', 'support@wix', 'info@example', 'admin@example', 'test@']
const JUNK_DOMAINS  = ['example.com', 'wixpress.com', 'sentry.io', 'mailchimp.com', 'sendgrid.net']

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const e = email.trim().toLowerCase()
  if (!EMAIL_REGEX.test(e)) return false
  if (JUNK_PREFIXES.some(p => e.startsWith(p))) return false
  const domain = e.split('@')[1] || ''
  if (JUNK_DOMAINS.includes(domain)) return false
  return true
}

// ─── Niche Detector ───────────────────────────────────────────────────────
function detectNiche(searchQuery = '', category = '') {
  const text = (searchQuery + ' ' + category).toLowerCase()
  if (text.includes('dental') || text.includes('dentist'))           return 'dental'
  if (text.includes('restaurant') || text.includes('hospitality') || text.includes('food service') || text.includes('food')) return 'restaurant'
  if (text.includes('real estate') || text.includes('realtor') || text.includes('realty')) return 'realestate'
  if (text.includes('health') || text.includes('clinic') || text.includes('medical')) return 'healthcare'
  if (text.includes('law') || text.includes('legal') || text.includes('attorney')) return 'legal'
  if (text.includes('saas') || text.includes('software') || text.includes('tech')) return 'saas'
  return 'general'
}

// ─── Email Templates ──────────────────────────────────────────────────────
const TEMPLATES = {
  dental: {
    subject: (name) => `${name} — Quick question about appointment losses`,
    body: (name, city) => `Hi there,

I came across ${name} while researching dental practices in ${city}.

I run a small revenue audit service called Blue Data Labs. We help dental practices find where they're quietly losing revenue — no-shows, unscheduled recalls, new patient follow-up gaps.

On average, our audits surface $1,800–$3,200/month in recoverable revenue for offices your size.

We have a free 2-minute calculator that shows exactly where it's coming from:
👉 https://bdl.dataconnectmail.com

No obligation, no sales call — just an honest look at the numbers.

— James
Blue Data Labs | Revenue Audit Service`
  },
  restaurant: {
    subject: (name) => `${name} — Quick question about delivery & waste costs`,
    body: (name, city) => `Hi there,

I found ${name} while researching restaurants in ${city}.

I run Blue Data Labs — a small revenue audit service. We help restaurant owners find hidden leakage: food waste, delivery platform commissions, no-show losses, and staff cost inefficiencies.

Most restaurants we audit are losing $1,500–$4,000/month without realising it.

We have a free 2-minute calculator that shows the breakdown for your restaurant:
👉 https://bdl.dataconnectmail.com

No obligation — just a real look at the numbers.

— James
Blue Data Labs | Revenue Audit Service`
  },
  realestate: {
    subject: (name) => `${name} — Quick question about lead follow-up ROI`,
    body: (name, city) => `Hi there,

I came across ${name} while researching real estate businesses in ${city}.

I run Blue Data Labs — we help real estate teams find where deals are slipping: lead follow-up gaps, portal ROI issues, agent admin time waste.

Our audits typically surface $2,500–$6,000/month in recoverable commission for teams your size.

We have a free 2-minute calculator:
👉 https://bdl.dataconnectmail.com

No pitch — just an honest look at the numbers.

— James
Blue Data Labs | Revenue Audit Service`
  },
  healthcare: {
    subject: (name) => `${name} — Quick question about patient revenue losses`,
    body: (name, city) => `Hi there,

I found ${name} while researching healthcare practices in ${city}.

I run Blue Data Labs — we help clinics and practices identify revenue leakage from no-shows, claim denials, and referral non-conversions.

Our audits typically surface $1,500–$3,500/month in recoverable revenue.

Free 2-minute calculator:
👉 https://bdl.dataconnectmail.com

No obligation at all.

— James
Blue Data Labs | Revenue Audit Service`
  },
  legal: {
    subject: (name) => `${name} — Quick question about billable hour recovery`,
    body: (name, city) => `Hi there,

I came across ${name} while researching law firms in ${city}.

I run Blue Data Labs — we help firms recover unbilled attorney time and improve consultation conversion rates.

Most firms we audit find $3,000–$8,000/month in recoverable billable revenue.

Free 2-minute calculator:
👉 https://bdl.dataconnectmail.com

No obligation.

— James
Blue Data Labs | Revenue Audit Service`
  },
  general: {
    subject: (name) => `${name} — Quick question about your revenue`,
    body: (name, city) => `Hi there,

I found ${name} while researching businesses in ${city}.

I run Blue Data Labs — a small revenue audit service. We help business owners find where revenue is quietly leaking out: missed follow-ups, tool cost waste, admin time losses.

Most businesses we audit find $1,200–$3,500/month they didn't know they were losing.

Free 2-minute calculator:
👉 https://bdl.dataconnectmail.com

No obligation.

— James
Blue Data Labs | Revenue Audit Service`
  }
}

function getTemplate(niche, name, city) {
  const t = TEMPLATES[niche] || TEMPLATES.general
  const displayName = name && name.trim() ? name.trim() : 'there'
  const displayCity = city && city.trim() ? city.trim() : 'your area'
  return {
    subject: t.subject(displayName),
    body:    t.body(displayName, displayCity)
  }
}

// ─── CSV Parser ───────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  return lines.slice(1).map(line => {
    const cols = []
    let cur = '', inQ = false
    for (let ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, '').trim() })
    return row
  })
}

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({ label, value, colorClass = 'text-white', description, icon }) {
  return (
    <div className="bg-gray-900/55 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 transition-all duration-355 hover:border-gray-700/80 hover:translate-y-[-2px] flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
        {icon && <span className="text-lg bg-gray-850 p-1.5 rounded-lg border border-gray-800/50">{icon}</span>}
      </div>
      <div>
        <div className={`text-3xl font-extrabold tracking-tight ${colorClass}`}>{value}</div>
        {description && <p className="text-gray-500 text-[11px] mt-1 font-medium">{description}</p>}
      </div>
    </div>
  )
}

const NICHE_COLORS = {
  dental:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  restaurant: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  realestate: 'bg-green-500/10 text-green-400 border-green-500/20',
  healthcare: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  legal:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  saas:       'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  general:    'bg-gray-700/50 text-gray-400 border-gray-600',
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function CampaignPage() {
  const [tab, setTab]               = useState('import')
  const [cleanRows, setCleanRows]   = useState([])
  const [selected, setSelected]     = useState({})
  const [stats, setStats]           = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [sending, setSending]       = useState(false)
  const [sendProgress, setSendProgress] = useState({ done: 0, total: 0, failed: [], logs: [] })
  const [sendDone, setSendDone]     = useState(false)
  const [previewLead, setPreviewLead] = useState(null)
  
  // Table search & filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [activeNicheFilter, setActiveNicheFilter] = useState('all')

  const fileRef = useRef()

  const getSentLog    = () => { try { return new Set(JSON.parse(localStorage.getItem('bdl_campaign_sent') || '[]')) } catch { return new Set() } }
  const appendSentLog = (emails) => { const s = getSentLog(); emails.forEach(e => s.add(e.toLowerCase())); localStorage.setItem('bdl_campaign_sent', JSON.stringify([...s])) }
  const clearSentLog  = () => { localStorage.removeItem('bdl_campaign_sent'); setSentLogCount(0) }
  const [sentLogCount, setSentLogCount] = useState(() => getSentLog().size)

  const processFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) { alert('Please upload a .csv file from the BDL Lead Scraper output folder.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result)
      const sentLog = getSentLog()
      const seenEmails = new Set()
      let noEmail = 0, invalidEmail = 0, duplicate = 0, alreadySent = 0

      const clean = rows.filter(row => {
        const email = (row['Email'] || '').trim().toLowerCase()
        if (!email)              { noEmail++;      return false }
        if (!isValidEmail(email)){ invalidEmail++; return false }
        if (seenEmails.has(email)){ duplicate++;   return false }
        if (sentLog.has(email))  { alreadySent++;  return false }
        seenEmails.add(email)
        return true
      }).map(row => ({
        ...row,
        _niche: detectNiche(row['Search Query'] || '', row['Category'] || ''),
        _email: (row['Email'] || '').trim().toLowerCase(),
      }))

      const sel = {}
      clean.forEach((_, i) => { sel[i] = true })
      setCleanRows(clean)
      setSelected(sel)
      setStats({ total: rows.length, noEmail, invalid: invalidEmail, duplicate, alreadySent, clean: clean.length })
      setSendDone(false)
      setTab('review')
    }
    reader.readAsText(file)
  }

  const toggleAll = (val) => {
    const next = { ...selected }
    filteredRows.forEach(row => {
      const originalIndex = cleanRows.findIndex(r => r._email === row._email)
      if (originalIndex !== -1) {
        next[originalIndex] = val
      }
    })
    setSelected(next)
  }

  const removeRow = (originalIndex) => {
    setCleanRows(prev => prev.filter((_, idx) => idx !== originalIndex))
    setSelected(prev => {
      const next = {}
      let ni = 0
      Object.keys(prev).forEach(k => {
        const keyInt = parseInt(k)
        if (keyInt !== originalIndex) {
          next[ni] = prev[k]
          ni++
        }
      })
      return next
    })
  }

  // Filtered rows for Tab 2 Table
  const filteredRows = useMemo(() => {
    return cleanRows.filter(row => {
      const matchesSearch = !searchQuery || 
        row['Name']?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        row._email.includes(searchQuery.toLowerCase()) || 
        row['City']?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesNiche = activeNicheFilter === 'all' || row._niche === activeNicheFilter
      return matchesSearch && matchesNiche
    })
  }, [cleanRows, searchQuery, activeNicheFilter])

  // Count matches by niche for filters
  const nicheCounts = useMemo(() => {
    const counts = { all: cleanRows.length }
    cleanRows.forEach(r => {
      counts[r._niche] = (counts[r._niche] || 0) + 1
    })
    return counts
  }, [cleanRows])

  const selectedRows = cleanRows.filter((_, i) => selected[i])

  // ─── Send Campaign ──────────────────────────────────────────────────────
  const handleSend = async () => {
    if (selectedRows.length === 0) { alert('No leads selected.'); return }
    if (!window.confirm(`Send cold outreach emails to ${selectedRows.length} leads? This cannot be undone.`)) return

    setSending(true); setSendDone(false)
    setSendProgress({ done: 0, total: selectedRows.length, failed: [], logs: [] })
    const failed = []; const sentEmails = []

    for (let i = 0; i < selectedRows.length; i++) {
      const lead = selectedRows[i]
      const tmpl = getTemplate(lead._niche, lead['Name'], lead['City'])
      const timestamp = new Date().toLocaleTimeString()
      
      const newLog = {
        time: timestamp,
        email: lead._email,
        name: lead['Name'] || 'Business',
        niche: lead._niche,
        status: 'sending'
      }

      setSendProgress(prev => ({
        ...prev,
        logs: [newLog, ...prev.logs]
      }))

      try {
        const res = await sheetsApi.sendColdOutreach({ to: lead._email, name: lead['Name'] || '', city: lead['City'] || '', niche: lead._niche, subject: tmpl.subject, body: tmpl.body })
        
        if (res && res.success) {
          sentEmails.push(lead._email)
          setSendProgress(prev => {
            const updatedLogs = [...prev.logs]
            updatedLogs[0] = { ...newLog, status: 'success' }
            return { ...prev, done: i + 1, logs: updatedLogs }
          })
        } else {
          const reason = res?.error || 'Unknown error'
          failed.push({ email: lead._email, reason })
          setSendProgress(prev => {
            const updatedLogs = [...prev.logs]
            updatedLogs[0] = { ...newLog, status: 'failed', reason }
            return { ...prev, done: i + 1, failed: [...prev.failed, { email: lead._email, reason }], logs: updatedLogs }
          })
        }
      } catch (err) {
        failed.push({ email: lead._email, reason: err.message })
        setSendProgress(prev => {
          const updatedLogs = [...prev.logs]
          updatedLogs[0] = { ...newLog, status: 'failed', reason: err.message }
          return { ...prev, done: i + 1, failed: [...prev.failed, { email: lead._email, reason: err.message }], logs: updatedLogs }
        })
      }

      // Small delay to protect Gmail quota
      if (i < selectedRows.length - 1) await new Promise(r => setTimeout(r, 700))
    }

    appendSentLog(sentEmails)
    setSentLogCount(getSentLog().size)
    setSending(false); setSendDone(true)
    setCleanRows(prev => prev.filter(r => !sentEmails.includes(r._email)))
    setSelected({})
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const preview = previewLead ? getTemplate(previewLead._niche, previewLead['Name'], previewLead['City']) : null

  // Cleaning breakdown percentages for Tab 2
  const statsBreakdown = useMemo(() => {
    if (!stats || stats.total === 0) return null
    const validPct = Math.round((stats.clean / stats.total) * 100)
    const noEmailPct = Math.round((stats.noEmail / stats.total) * 100)
    const invalidPct = Math.round((stats.invalid / stats.total) * 100)
    const dupPct = Math.round((stats.duplicate / stats.total) * 100)
    const sentPct = Math.round((stats.alreadySent / stats.total) * 100)
    return { validPct, noEmailPct, invalidPct, dupPct, sentPct }
  }, [stats])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-900/40 p-6 rounded-2xl border border-gray-800/60 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Mailer (Outbound)</h1>
          </div>
          <p className="text-gray-400 text-xs mt-2 bg-orange-500/5 border border-orange-500/10 px-3 py-2 rounded-lg leading-relaxed max-w-2xl">
            <strong>🚀 OUTBOUND STEP 1:</strong> Import a CSV from your Prospect Finder / Scraper. Review clean results, drop junk emails, and click <strong>"Launch Outreach"</strong> to send custom-niche emails and automatically add them to the Leads Directory.
          </p>
        </div>
        {sentLogCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-900/80 border border-gray-805">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-gray-300 text-xs font-semibold">{sentLogCount} campaigns sent historically</span>
            <button 
              onClick={() => { if (window.confirm('Reset local campaign sent history? This will re-allow outreach to previously emailed addresses.')) clearSentLog() }} 
              className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors border-l border-gray-700 pl-3 ml-1"
            >
              Reset Log
            </button>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-gray-900/60 p-1.5 rounded-xl border border-gray-800/80 gap-1 w-fit">
        {[
          { id: 'import', label: '📥 Import & Clean' },
          { id: 'review', label: `📋 Review Leads ${cleanRows.length > 0 ? `(${cleanRows.length})` : ''}` },
          { id: 'send',   label: '📤 Send Outreach' },
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)} 
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === t.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/10' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: IMPORT ─────────────────────────────────────────────── */}
      {tab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[340px] ${isDragging ? 'border-orange-500 bg-orange-600/5' : 'border-gray-800 bg-gray-900/20 hover:border-gray-700 hover:bg-gray-900/40'}`}
            >
              <div className="w-16 h-16 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center text-3xl mb-5 shadow-inner">📄</div>
              <h3 className="text-white font-bold text-lg mb-1">Drag and drop leads database</h3>
              <p className="text-gray-500 text-sm max-w-sm mb-6">
                Drag a <code className="bg-gray-800 px-1.5 py-0.5 rounded text-orange-400 font-mono text-xs">.csv</code> file exported from the BDL Lead Scraper app.
              </p>
              <div className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-orange-600/10 hover:shadow-orange-600/20">
                📂 Browse Local File
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]) }} />
            </div>

            <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <span className="text-green-500">🛡️</span> Data Filtering Pipeline Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['Missing email removal', 'Automatically drops any records scraped without a contact address.'],
                  ['Format & validation filtering', 'Checks email structure against strictly enforced pattern matching.'],
                  ['System & junk filters', 'Strips generic accounts like noreply@, support@wix, postmaster@, etc.'],
                  ['Local deduplication', 'Filters out duplicate records found within the same spreadsheet.'],
                  ['Historical safety check', 'Cross-references against local logs to prevent emailing previous leads.'],
                ].map(([label, desc], i) => (
                  <div key={label} className="bg-gray-950/40 p-4 rounded-xl border border-gray-800/40 flex items-start gap-3">
                    <span className="text-green-500 text-xs font-bold bg-green-500/10 w-5 h-5 rounded-full flex items-center justify-center border border-green-500/10">{i+1}</span>
                    <div>
                      <h4 className="text-gray-200 text-xs font-bold">{label}</h4>
                      <p className="text-gray-500 text-[11px] mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-gray-300 font-bold text-xs uppercase tracking-wider">Quick Info</h3>
              <div className="text-gray-400 text-xs leading-relaxed space-y-3">
                <p>💡 <strong className="text-gray-200">How to get a file:</strong> Open the BDL Lead Finder app by clicking <code className="bg-gray-900 px-1 py-0.5 rounded text-orange-400 text-[10px]">RUN_APP.bat</code>, search for niche + city, and download the resulting CSV file.</p>
                <p>🎯 <strong className="text-gray-200">Niche Match:</strong> The system automatically extracts niche indicators from the search history headers to apply tailored dental, restaurant, legal, or real estate pitch copy.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: REVIEW ─────────────────────────────────────────────── */}
      {tab === 'review' && (
        <div className="space-y-6">
          {stats && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                <StatCard label="Total Inbound"   value={stats.total}       colorClass="text-gray-300" icon="📦" />
                <StatCard label="Missing Email"   value={stats.noEmail}     colorClass="text-gray-500" icon="🚫" />
                <StatCard label="Invalid/Junk"    value={stats.invalid}     colorClass="text-red-400"  icon="👾" />
                <StatCard label="Duplicates"      value={stats.duplicate}   colorClass="text-yellow-400" icon="👥" />
                <StatCard label="Already Sent"    value={stats.alreadySent} colorClass="text-purple-400" icon="🗄️" />
                <StatCard label="Clean & Ready"   value={stats.clean}       colorClass="text-green-400" icon="✨" />
              </div>

              {/* Graphical Cleaning Ratio Bar */}
              {statsBreakdown && stats.total > 0 && (
                <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-400 px-1">
                    <span>Cleaning Pipeline Distribution</span>
                    <span className="text-green-400">{statsBreakdown.validPct}% Kept</span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden bg-gray-800 flex">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${statsBreakdown.validPct}%` }} title={`Ready: ${statsBreakdown.validPct}%`}></div>
                    <div className="h-full bg-gray-750 transition-all duration-500" style={{ width: `${statsBreakdown.noEmailPct}%` }} title={`No Email: ${statsBreakdown.noEmailPct}%`}></div>
                    <div className="h-full bg-red-500/80 transition-all duration-500" style={{ width: `${statsBreakdown.invalidPct}%` }} title={`Invalid/Junk: ${statsBreakdown.invalidPct}%`}></div>
                    <div className="h-full bg-yellow-500/80 transition-all duration-500" style={{ width: `${statsBreakdown.dupPct}%` }} title={`Duplicates: ${statsBreakdown.dupPct}%`}></div>
                    <div className="h-full bg-purple-500/80 transition-all duration-500" style={{ width: `${statsBreakdown.sentPct}%` }} title={`Already Sent: ${statsBreakdown.sentPct}%`}></div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px] font-semibold text-gray-500 pt-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-green-500"></span> Ready ({stats.clean})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-gray-700"></span> No Email ({stats.noEmail})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-red-500/80"></span> Invalid ({stats.invalid})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-yellow-500/80"></span> Duplicates ({stats.duplicate})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-purple-500/80"></span> Already Sent ({stats.alreadySent})</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {cleanRows.length === 0 ? (
            <div className="text-center py-16 bg-gray-900/30 rounded-2xl border border-gray-800/80">
              <div className="text-4xl mb-3">📭</div>
              <h3 className="text-white font-bold mb-1">No Leads Loaded</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mb-4">Go to the Import tab to load a new scraper CSV sheet.</p>
              <button onClick={() => setTab('import')} className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition-all">Go to Import</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Leads Table Panel */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-gray-950/40 p-4 rounded-2xl border border-gray-800/50">
                  <div className="relative w-full sm:max-w-xs">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search company, email, city..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500 w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAll(true)}  className="text-[11px] font-bold border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-lg transition-colors">Select All</button>
                    <button onClick={() => toggleAll(false)} className="text-[11px] font-bold border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-lg transition-colors">Deselect All</button>
                    <button onClick={() => setTab('send')} className="text-sm bg-orange-600 hover:bg-orange-500 text-white font-medium px-4 py-1.5 rounded-lg transition-colors">Continue to Send →</button>
                  </div>
                </div>

                {/* Niche Pills selector */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mr-2">Filter Niche:</span>
                  {Object.keys(nicheCounts).map(nicheName => (
                    <button
                      key={nicheName}
                      onClick={() => setActiveNicheFilter(nicheName)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${activeNicheFilter === nicheName ? 'bg-orange-600/20 text-orange-400 border-orange-500/30' : 'bg-gray-900/30 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-300'}`}
                    >
                      {nicheName} <span className="text-[10px] opacity-60 ml-0.5">({nicheCounts[nicheName]})</span>
                    </button>
                  ))}
                </div>

                {/* Table wrapper */}
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 bg-gray-900/70 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="px-4 py-3 text-left w-10">
                            <input 
                              type="checkbox" 
                              checked={filteredRows.length > 0 && filteredRows.every(row => {
                                const idx = cleanRows.findIndex(r => r._email === row._email)
                                return !!selected[idx]
                              })} 
                              onChange={e => toggleAll(e.target.checked)} 
                            />
                          </th>
                          <th className="px-4 py-3 text-left">Company</th>
                          <th className="px-4 py-3 text-left">Email Address</th>
                          <th className="px-4 py-3 text-left">Niche</th>
                          <th className="px-4 py-3 text-left">City</th>
                          <th className="px-4 py-3 text-left">Preview</th>
                          <th className="px-4 py-3 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850">
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-10 text-gray-500 text-xs">No records found matching search filters.</td>
                          </tr>
                        ) : (
                          filteredRows.map((row) => {
                            const originalIdx = cleanRows.findIndex(r => r._email === row._email)
                            return (
                              <tr key={row._email} className={`hover:bg-gray-850/40 transition-colors ${!selected[originalIdx] ? 'opacity-40' : ''}`}>
                                <td className="px-4 py-3">
                                  <input 
                                    type="checkbox" 
                                    checked={!!selected[originalIdx]} 
                                    onChange={e => setSelected(p => ({ ...p, [originalIdx]: e.target.checked }))} 
                                  />
                                </td>
                                <td className="px-4 py-3 text-white font-medium max-w-[150px] truncate" title={row['Name']}>{row['Name'] || '—'}</td>
                                <td className="px-4 py-3 text-gray-300 font-mono text-xs max-w-[180px] truncate" title={row._email}>{row._email}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${NICHE_COLORS[row._niche]}`}>{row._niche}</span>
                                </td>
                                <td className="px-4 py-3 text-gray-400 max-w-[100px] truncate" title={row['City']}>{row['City'] || '—'}</td>
                                <td className="px-4 py-3">
                                  <button 
                                    onClick={() => setPreviewLead(previewLead?._email === row._email ? null : row)} 
                                    className={`text-[10px] font-bold border px-2.5 py-1 rounded transition-colors ${previewLead?._email === row._email ? 'bg-orange-600 border-orange-500 text-white' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'}`}
                                  >
                                    👁 Preview
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <button onClick={() => removeRow(originalIdx)} className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none" title="Remove lead">×</button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Preview Drawer Panel */}
              <div className="space-y-4">
                {previewLead && preview ? (
                  <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl overflow-hidden shadow-2xl animate-fadeIn">
                    {/* Mock Email Header */}
                    <div className="bg-gray-955 p-4 border-b border-gray-800/80">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-orange-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                          Tailored Pitch Preview
                        </span>
                        <button onClick={() => setPreviewLead(null)} className="text-gray-500 hover:text-white text-lg">×</button>
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-xs text-gray-500"><strong className="text-gray-400">To:</strong> {previewLead['Name'] || 'Business'} &lt;{previewLead._email}&gt;</div>
                        <div className="text-xs text-gray-500"><strong className="text-gray-400">From:</strong> James (Blue Data Labs) &lt;outreach@bluedatalabs.com&gt;</div>
                        <div className="text-xs text-gray-500"><strong className="text-gray-400">Subject:</strong> {preview.subject}</div>
                      </div>
                    </div>
                    {/* Mock Email Body */}
                    <div className="p-4 bg-gray-900/20">
                      <div className="border border-gray-800/40 bg-gray-950/30 p-4 rounded-xl max-h-[380px] overflow-y-auto">
                        <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-sans font-normal">{preview.body}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900/30 border border-gray-800/60 border-dashed rounded-2xl p-8 text-center text-gray-500 min-h-[250px] flex flex-col items-center justify-center">
                    <span className="text-2xl mb-2">👁️</span>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select a lead</h4>
                    <p className="text-[11px] text-gray-500 mt-1 max-w-[180px]">Click the Preview button on any lead to review its custom email pitch.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SEND ───────────────────────────────────────────────── */}
      {tab === 'send' && (
        <div className="max-w-3xl mx-auto space-y-6">
          {sendDone ? (
            <div className="text-center py-16 bg-gray-900/40 rounded-3xl border border-gray-800/80 backdrop-blur-md space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full text-4xl mb-2">✓</div>
              <h2 className="text-white text-xl font-bold">Campaign Fully Processed!</h2>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Successfully dispatched {sendProgress.done - sendProgress.failed.length} emails. Sent history logged to spreadsheet records.
              </p>
              {sendProgress.failed.length > 0 && (
                <p className="text-red-400 text-xs font-semibold">{sendProgress.failed.length} sends encountered errors.</p>
              )}
              <div className="pt-4">
                <button 
                  onClick={() => { setTab('import'); setStats(null); setCleanRows([]); setSendDone(false) }} 
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-orange-600/15 text-xs uppercase tracking-wider"
                >
                  🚀 Launch Another Campaign
                </button>
              </div>
              
              {sendProgress.failed.length > 0 && (
                <div className="mt-8 bg-red-500/5 border border-red-500/10 rounded-2xl p-5 text-left max-w-md mx-auto">
                  <p className="text-red-400 text-xs font-bold mb-3 uppercase tracking-wider">Error Report:</p>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {sendProgress.failed.map((f, i) => (
                      <p key={i} className="text-red-400/70 text-[11px] font-mono"><strong className="text-red-400">{f.email}</strong>: {f.reason}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Campaign statistics summary */}
              <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-bold text-xs uppercase tracking-wider">Outreach Target Matrix</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="bg-gray-950/40 border border-orange-500/20 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-orange-400">{selectedRows.length}</div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">Selected</div>
                  </div>
                  {['dental', 'restaurant', 'realestate', 'healthcare', 'legal', 'general'].map(n => {
                    const count = selectedRows.filter(r => r._niche === n).length
                    if (count === 0) return null
                    return (
                      <div key={n} className="bg-gray-950/20 border border-gray-800/50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-gray-300">{count}</div>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">{n}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Sample preview bar */}
              <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 space-y-2">
                <h3 className="text-white font-bold text-xs uppercase tracking-wider">Outreach Copy Sample (Restaurant)</h3>
                <div className="border border-gray-800/50 bg-gray-950/30 p-4 rounded-xl text-xs font-mono text-gray-400 max-h-[140px] overflow-y-auto">
                  <span className="text-white font-sans font-bold block mb-1">Subject: {TEMPLATES.restaurant.subject('Bella Cucina')}</span>
                  {TEMPLATES.restaurant.body('Bella Cucina', 'Austin, TX')}
                </div>
              </div>

              {/* Real-time sending panel */}
              {sending && (
                <div className="bg-gray-900/60 border border-orange-500/30 rounded-2xl p-6 space-y-5 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></div>
                      <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Dispatched Queues Executing...</span>
                    </div>
                    <span className="text-white text-xs font-extrabold">{sendProgress.done} / {sendProgress.total} Complete</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-700/50">
                    <div 
                      className="bg-orange-600 h-full rounded-full transition-all duration-300 shadow-md shadow-orange-500/20" 
                      style={{ width: `${(sendProgress.done / sendProgress.total) * 100}%` }}
                    />
                  </div>

                  {/* Terminal Log Console */}
                  <div className="space-y-1.5">
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider px-1">Outreach Connection Log:</p>
                    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-[11px] leading-relaxed max-h-[180px] overflow-y-auto flex flex-col-reverse gap-1.5">
                      {sendProgress.logs.map((logItem, idx) => (
                        <div key={idx} className="flex justify-between border-b border-gray-900/40 pb-1">
                          <span className="text-gray-500">[{logItem.time}]</span>
                          <span className="text-gray-300 font-semibold">{logItem.name} ({logItem.email})</span>
                          {logItem.status === 'sending' && <span className="text-yellow-400">⚡ sending...</span>}
                          {logItem.status === 'success' && <span className="text-green-400">✓ sent</span>}
                          {logItem.status === 'failed' && <span className="text-red-400" title={logItem.reason}>✗ error</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedRows.length === 0 && !sending && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-yellow-400/80 text-xs font-bold text-center">
                  ⚠️ No target emails selected in the Review tab.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setTab('review')} 
                  disabled={sending} 
                  className="flex-1 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white text-xs font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  ← Back to Review
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || selectedRows.length === 0}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/10"
                >
                  {sending ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Dispatching...</>
                  ) : (
                    `🚀 Launch Outreach to ${selectedRows.length} Leads`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
