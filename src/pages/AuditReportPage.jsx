import { useState, useRef } from 'react'
import { useLeadsStore } from '../store/leadsStore'
import { sheetsApi } from '../lib/sheetsApi'

// ── Niche leakage benchmark data ─────────────────────────
const NICHE_BENCHMARKS = {
  restaurant: {
    label: 'Restaurant',
    icon: '🍽️',
    issues: [
      { title: 'Food Waste (Avg 15–20% of inventory)', pct: 0.15, color: '#EF4444' },
      { title: 'No-Shows & Last-Minute Cancellations', pct: 0.10, color: '#F97316' },
      { title: 'Delivery Platform Commissions (25–30%)', pct: 0.08, color: '#F59E0B' },
      { title: 'Low Review Visibility / Rating Gaps', pct: 0.05, color: '#8B5CF6' },
    ],
  },
  dental: {
    label: 'Dental Practice',
    icon: '🦷',
    issues: [
      { title: 'Appointment No-Shows (Avg 12% rate)', pct: 0.12, color: '#EF4444' },
      { title: 'Unscheduled Recall Patients', pct: 0.10, color: '#F97316' },
      { title: 'New Patient Follow-Up Gaps', pct: 0.08, color: '#F59E0B' },
      { title: 'Staff Idle Time Between Appointments', pct: 0.05, color: '#8B5CF6' },
    ],
  },
  realestate: {
    label: 'Real Estate',
    icon: '🏠',
    issues: [
      { title: 'Lead Follow-Up Gap (5+ touches needed)', pct: 0.18, color: '#EF4444' },
      { title: 'Portal Spend vs. Returns (Zillow, etc.)', pct: 0.12, color: '#F97316' },
      { title: 'Agent Time on Admin vs. Selling', pct: 0.08, color: '#F59E0B' },
      { title: 'Low Online Review Volume', pct: 0.04, color: '#8B5CF6' },
    ],
  },
  healthcare: {
    label: 'Healthcare',
    icon: '🏥',
    issues: [
      { title: 'Patient No-Shows (Avg 8–12% rate)', pct: 0.10, color: '#EF4444' },
      { title: 'Insurance Claim Rejections (5–10%)', pct: 0.09, color: '#F97316' },
      { title: 'Referral Non-Conversion Rate', pct: 0.07, color: '#F59E0B' },
      { title: 'Under-Optimised Online Presence', pct: 0.04, color: '#8B5CF6' },
    ],
  },
  legal: {
    label: 'Legal / Law Firm',
    icon: '⚖️',
    issues: [
      { title: 'Unbilled Attorney Hours (Time Leakage)', pct: 0.15, color: '#EF4444' },
      { title: 'Consultation Non-Conversion', pct: 0.12, color: '#F97316' },
      { title: 'Admin Burden on Billable Staff', pct: 0.08, color: '#F59E0B' },
      { title: 'Low Local Review Score', pct: 0.04, color: '#8B5CF6' },
    ],
  },
  saas: {
    label: 'SaaS / Tech',
    icon: '💻',
    issues: [
      { title: 'Monthly Customer Churn (Avg 3–5%)', pct: 0.05, color: '#EF4444' },
      { title: 'Free Trial Non-Conversion (Avg 10–20%)', pct: 0.12, color: '#F97316' },
      { title: 'Feature Adoption Gaps', pct: 0.06, color: '#F59E0B' },
      { title: 'Customer Success Coverage Gaps', pct: 0.04, color: '#8B5CF6' },
    ],
  },
  general: {
    label: 'General Business',
    icon: '🏢',
    issues: [
      { title: 'Lead Follow-Up & Conversion Gaps', pct: 0.15, color: '#EF4444' },
      { title: 'Admin Inefficiency & Manual Processes', pct: 0.10, color: '#F97316' },
      { title: 'Online Reputation Gaps', pct: 0.07, color: '#F59E0B' },
      { title: 'Retention & Repeat Business Loss', pct: 0.05, color: '#8B5CF6' },
    ],
  },
}

const RECOVERY_STEPS = {
  restaurant: [
    { step: 1, title: 'Food Waste Audit', desc: 'Implement portion tracking & weekly inventory reviews to cut waste by 30–50% within 60 days.' },
    { step: 2, title: 'Reservation Recovery System', desc: 'Deploy automated confirmation texts & deposit requirements for reservations over 4 guests.' },
    { step: 3, title: 'Review & Rating Acceleration', desc: 'Create a QR code at table / receipt that prompts happy customers to leave Google reviews.' },
  ],
  dental: [
    { step: 1, title: 'No-Show Prevention Protocol', desc: 'Send automated SMS reminders 48h & 2h before appointments. Charge $50 for repeated no-shows.' },
    { step: 2, title: 'Recall Reactivation Campaign', desc: 'Export 6-month overdue patients and send a personalised reactivation email & call sequence.' },
    { step: 3, title: 'Front-Desk Conversion Training', desc: 'Script every new-patient call with a 3-step qualification and immediate booking close.' },
  ],
  realestate: [
    { step: 1, title: '5-Touch Follow-Up Automation', desc: 'Build an email + SMS drip sequence for new leads with 5 touchpoints over 14 days.' },
    { step: 2, title: 'Portal ROI Review', desc: 'Calculate cost-per-deal from each portal. Reallocate budget to channels with positive ROI.' },
    { step: 3, title: 'Agent Time Audit', desc: 'Block 2 hours daily as "admin-free selling time". Automate repetitive tasks with CRM templates.' },
  ],
  healthcare: [
    { step: 1, title: 'No-Show Fee Policy', desc: 'Introduce a $50 no-show policy communicated at booking. Reduces no-show rates by up to 40%.' },
    { step: 2, title: 'Claims Denial Review', desc: 'Audit top 5 denial reasons. Fix coding errors and implement pre-authorisation for high-risk claims.' },
    { step: 3, title: 'Referral Follow-Up Protocol', desc: 'Call every new referral within 24 hours. Track conversion rate weekly.' },
  ],
  legal: [
    { step: 1, title: 'Time Tracking Discipline', desc: 'Implement a 15-minute time-tracking rule. Every attorney logs billable time in real time, not end-of-day.' },
    { step: 2, title: 'Consultation Close Script', desc: 'Train attorneys on a structured consultation-to-retainer pitch. Add urgency with a 7-day proposal expiry.' },
    { step: 3, title: 'Admin Task Delegation', desc: 'Audit which admin tasks can be delegated to paralegals, freeing 4–8 billable hours per attorney/week.' },
  ],
  saas: [
    { step: 1, title: 'Churn Early-Warning System', desc: 'Flag accounts with <30% feature adoption or no logins in 14 days. Trigger an automatic CS outreach.' },
    { step: 2, title: 'Trial Conversion Onboarding', desc: 'Build a 5-email activation sequence. Get users to their "aha moment" within 72 hours of sign-up.' },
    { step: 3, title: 'Annual Plan Upsell Campaign', desc: 'Offer a 20% annual plan discount to monthly customers to lock in revenue and reduce churn risk.' },
  ],
  general: [
    { step: 1, title: 'Lead Response Time Audit', desc: 'Benchmark current lead response time. Under 5 minutes increases conversions by 9x vs 30 minutes.' },
    { step: 2, title: 'Admin Automation Mapping', desc: 'List every manual admin task. Automate top 3 using free tools (Zapier, CRM templates, e-signatures).' },
    { step: 3, title: 'Review Generation Campaign', desc: 'Email every satisfied customer requesting a Google/Trustpilot review. Target 10 new reviews/month.' },
  ],
}

function getNiche(lead) {
  const n = (lead?.niche || '').toLowerCase()
  return NICHE_BENCHMARKS[n] ? n : 'general'
}

function estimateLeakage(lead, niche) {
  const rev = parseFloat(lead?.monthlyRevenue || lead?.dealValue || 0) || 25000
  const benchmarks = NICHE_BENCHMARKS[niche]
  return benchmarks.issues.map(i => ({
    ...i,
    monthly: Math.round(rev * i.pct * 0.6), // conservative 60% multiplier
  }))
}

// ── PDF Report Template ──────────────────────────────────
function ReportTemplate({ lead, niche, leakageItems, totalMonthly }) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const nicheData = NICHE_BENCHMARKS[niche]
  const recoverySteps = RECOVERY_STEPS[niche] || RECOVERY_STEPS.general
  const annualLeakage = totalMonthly * 12

  return (
    <div id="audit-report-preview" style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: '#fff',
      color: '#111',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '48px',
      fontSize: '13px',
      lineHeight: '1.6',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px', borderBottom: '3px solid #F97316', paddingBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#F97316', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Blue Data Labs</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#111', lineHeight: '1.2' }}>Revenue Leakage<br />Audit Report</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>{nicheData.icon} {nicheData.label} — Prepared {today}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prepared for</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#111' }}>{lead.company || 'Business Name'}</div>
          <div style={{ fontSize: '12px', color: '#555' }}>{lead.contact || ''}</div>
          {lead.city && <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{lead.city}</div>}
        </div>
      </div>

      {/* Estimated Leakage Hero */}
      <div style={{ background: 'linear-gradient(135deg, #FFF5F0, #FFF)', border: '2px solid #FED7AA', borderRadius: '12px', padding: '24px', marginBottom: '28px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Estimated Monthly Revenue Leakage</div>
        <div style={{ fontSize: '52px', fontWeight: '800', color: '#EF4444', letterSpacing: '-0.02em', lineHeight: '1' }}>${totalMonthly.toLocaleString()}</div>
        <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>That's approximately <strong style={{ color: '#111' }}>${annualLeakage.toLocaleString()}/year</strong> leaving {lead.company || 'your business'}</div>
        <div style={{ fontSize: '10px', color: '#F59E0B', marginTop: '8px', fontWeight: '600' }}>⚠️ Conservative estimate — actual losses may be higher</div>
      </div>

      {/* Leakage Breakdown */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>📊 Leakage Breakdown by Area</div>
        {leakageItems.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#222' }}>{item.title}</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: item.color }}>${item.monthly.toLocaleString()}/mo</span>
              </div>
              <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: item.color, borderRadius: '4px', width: `${Math.round((item.monthly / totalMonthly) * 100)}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 90-Day Recovery Roadmap */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>🗓️ 90-Day Recovery Roadmap</div>
        {recoverySteps.map((s) => (
          <div key={s.step} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '28px', height: '28px', background: '#F97316', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>{s.step}</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#111', marginBottom: '2px' }}>{s.title}</div>
              <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.5' }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Industry Benchmark */}
      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>📈 Industry Context</div>
        <p style={{ fontSize: '12px', color: '#444', margin: 0, lineHeight: '1.7' }}>
          According to industry research, the average {nicheData.label.toLowerCase()} loses between{' '}
          <strong style={{ color: '#EF4444' }}>{Math.round(leakageItems.reduce((s, i) => s + i.pct, 0) * 100 * 0.8)}% – {Math.round(leakageItems.reduce((s, i) => s + i.pct, 0) * 100 * 1.2)}%</strong>{' '}
          of monthly revenue to preventable operational issues. With the right systems in place, recovery of{' '}
          <strong style={{ color: '#22C55E' }}>60–80% of this leakage</strong> is achievable within 90 days.
        </p>
      </div>

      {/* CTA Footer */}
      <div style={{ background: 'linear-gradient(135deg, #FFF5F0, #FFF7ED)', border: '2px solid #FED7AA', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: '#111', marginBottom: '6px' }}>Ready to Recover This Revenue?</div>
        <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>Book a free 20-minute strategy call. We'll walk through exactly how to implement these steps for {lead.company || 'your business'}.</div>
        <div style={{ fontSize: '11px', color: '#F97316', fontWeight: '700', letterSpacing: '0.04em' }}>bluedatalabs.com · jamescluster35@gmail.com</div>
      </div>

      {/* Legal */}
      <div style={{ marginTop: '20px', fontSize: '9px', color: '#AAA', lineHeight: '1.5', textAlign: 'center' }}>
        All figures are illustrative estimates based on publicly available industry benchmarks and conservative multipliers. They are not a guarantee of revenue recovery. Actual results vary. © 2026 BDL.
      </div>
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────
export default function AuditReportPage() {
  const { leads } = useLeadsStore()
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [syncingToDrive, setSyncingToDrive] = useState(false)
  const [driveLink, setDriveLink] = useState('')
  const reportRef = useRef(null)

  const warmLeads = leads.filter(l => l.status === 'Warm' || l.status === 'New')
  const selectedLead = leads.find(l => l.id === selectedLeadId) || null
  const niche = selectedLead ? getNiche(selectedLead) : 'general'
  const leakageItems = selectedLead ? estimateLeakage(selectedLead, niche) : []
  const totalMonthly = leakageItems.reduce((s, i) => s + i.monthly, 0)

  const handleGenerate = () => {
    if (!selectedLead) return
    setGenerating(true)
    setDriveLink('')
    setTimeout(() => {
      setGenerating(false)
      setShowPreview(true)
    }, 1200)
  }

  const handleSaveToDrive = async () => {
    if (!selectedLead) return
    setSyncingToDrive(true)
    try {
      const isPaid = ['paid', 'delivered'].includes(String(selectedLead.paidReport || '').trim().toLowerCase())
      const pdfType = isPaid ? 'full' : 'teaser'

      const res = await sheetsApi.saveLeadPdfToDrive(selectedLead.id, pdfType, "Direct from CRM Audit Generator")
      if (res && res.success && res.pdfLink) {
        setDriveLink(res.pdfLink)
      } else {
        alert(res?.error || 'Failed to save PDF to Google Drive.')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while generating PDF.')
    } finally {
      setSyncingToDrive(false)
    }
  }

  const handlePrint = () => {
    const reportEl = document.getElementById('audit-report-preview')
    if (!reportEl) return
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audit Report — ${selectedLead?.company || 'BDL'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: #fff; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>${reportEl.outerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 800)
  }

  return (
    <div className="p-4 md:p-6 w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Report Generator</h1>
          <p className="text-gray-400 text-sm mt-0.5">Generate a personalized PDF revenue audit report to attach to your cold emails</p>
        </div>
        {showPreview && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(false)}
              className="border border-gray-700 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSaveToDrive}
              disabled={syncingToDrive}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-950/30"
            >
              {syncingToDrive ? '☁️ Syncing...' : '☁️ Save to Drive & Get Link'}
            </button>
            <button
              onClick={handlePrint}
              className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-orange-950/30"
            >
              🖨️ Print / Download PDF
            </button>
          </div>
        )}
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Lead Selector */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-1">Select a Lead</h2>
              <p className="text-gray-500 text-xs mb-4">Pick the prospect you want to generate a report for</p>

              {/* Quick-pick warm leads */}
              <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto pr-1">
                {warmLeads.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center py-4">No warm or new leads yet.</p>
                ) : (
                  warmLeads.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedLeadId(l.id); setShowPreview(false); }}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 ${selectedLeadId === l.id
                        ? 'bg-orange-600/15 border-orange-500/40 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${l.status === 'Warm' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{l.company}</div>
                        <div className="text-[10px] text-gray-500 truncate">{l.contact} · {l.niche || 'General'}</div>
                      </div>
                      {selectedLeadId === l.id && <span className="ml-auto text-orange-400 text-xs">✓</span>}
                    </button>
                  ))
                )}
              </div>

              {/* Or search all leads */}
              <select
                value={selectedLeadId}
                onChange={e => setSelectedLeadId(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 transition"
              >
                <option value="">— Or select any lead —</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.company} ({l.status})</option>
                ))}
              </select>
            </div>

            {/* Preview info card */}
            {selectedLead && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3 animate-pulse-once">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{NICHE_BENCHMARKS[niche]?.icon || '🏢'}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{selectedLead.company}</div>
                    <div className="text-xs text-gray-500">{NICHE_BENCHMARKS[niche]?.label || 'General'} · {selectedLead.city || 'N/A'}</div>
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-3 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Est. Monthly Leakage</span>
                    <span className="text-red-400 font-bold">${totalMonthly.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Annual Leakage</span>
                    <span className="text-orange-400 font-bold">${(totalMonthly * 12).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Lead Status</span>
                    <span className="text-white font-semibold">{selectedLead.status}</span>
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-950/30 mt-1"
                >
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-orange-300 border-t-white rounded-full animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>📋 Generate PDF Audit Report</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right: How it works + quick demo */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-white mb-1">What's in the Report?</h2>
              <p className="text-gray-500 text-xs mb-5">Each report is tailored to the lead's niche and includes 4 key sections</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: '💸', title: 'Revenue Leakage Estimate', desc: 'Personalised monthly & annual leakage figure based on industry benchmarks and their niche.' },
                  { icon: '📊', title: 'Leakage Breakdown', desc: 'Visual bar chart showing the top 4 leakage areas with dollar values for their business.' },
                  { icon: '🗓️', title: '90-Day Recovery Roadmap', desc: '3 actionable steps specific to their industry that they can implement immediately.' },
                  { icon: '📈', title: 'Industry Benchmark Context', desc: 'Shows how they compare to the industry average — creates urgency to take action.' },
                ].map((item) => (
                  <div key={item.title} className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex gap-3">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-xs font-semibold text-white mb-1">{item.title}</div>
                      <div className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-white mb-3">How to Use This Report in Your Campaign</h3>
              <div className="flex flex-col gap-2.5">
                {[
                  { n: '1', t: 'Select a warm lead from the left panel' },
                  { n: '2', t: 'Click "Generate PDF Audit Report"' },
                  { n: '3', t: 'Review the preview, then click "Print / Download PDF"' },
                  { n: '4', t: 'Save as PDF (use "Print to PDF" in your browser)' },
                  { n: '5', t: 'Attach the PDF to your follow-up email — 3x higher reply rate' },
                ].map(s => (
                  <div key={s.n} className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="w-5 h-5 rounded-full bg-orange-600/20 border border-orange-500/30 text-orange-400 text-[10px] font-bold flex items-center justify-center shrink-0">{s.n}</span>
                    {s.t}
                  </div>
                ))}
              </div>
            </div>

            {!selectedLead && (
              <div className="bg-gradient-to-br from-orange-900/10 to-transparent border border-orange-500/20 rounded-xl p-6 text-center">
                <span className="text-4xl block mb-3">📋</span>
                <p className="text-gray-400 text-sm font-medium">Select a lead on the left to generate their personalized report</p>
                <p className="text-gray-600 text-xs mt-2">Reports are generated using industry-specific benchmarks tailored to the lead's niche</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Report Preview */
        <div className="flex flex-col gap-4">
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-green-400">✓</span>
            <div className="flex-1">
              <p className="text-green-300 text-sm font-semibold">Report Generated for {selectedLead?.company}</p>
              <p className="text-green-400/70 text-xs">Review the report below, then click "Print / Download PDF" in the top right to save it</p>
            </div>
          </div>

          {driveLink && (
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl px-4 py-4 flex flex-col gap-2 shadow-lg animate-pulse-once">
              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">☁️ Secure Google Drive PDF Link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={driveLink}
                  className="flex-1 bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none"
                  onClick={e => e.target.select()}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(driveLink); alert('Link copied to clipboard!'); }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-semibold shrink-0 transition-colors"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-gray-500 text-[10px]">Attach this link to your outreach templates to increase response rates by 3x.</p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" ref={reportRef}>
            <ReportTemplate
              lead={selectedLead}
              niche={niche}
              leakageItems={leakageItems}
              totalMonthly={totalMonthly}
            />
          </div>
        </div>
      )}
    </div>
  )
}
