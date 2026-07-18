import { useState } from 'react'
import { useLeadsStore } from '../../store/leadsStore'
import { useTemplatesStore } from '../../store/templatesStore'

const NICHES = ['Dental', 'SaaS', 'Real Estate', 'Junk Removal', 'Healthcare Staffing', 'Education']
const STATUSES = ['New', 'Pitched', 'Warm', 'Cold', 'Lost']
const STAGES = ['New', 'Pitched', 'Negotiating', 'Closed', 'Cold']


export default function LeadDetailPanel({ lead, onClose }) {
  const { updateLead, deleteLead, markLost, addLead, statusColors, stageColors, promoteClient, senders } = useLeadsStore()
  const senderNames = senders && senders.length > 0 ? senders.map(s => s.name) : ['Skinner Donald', 'Michael Brauns', 'Lyle Morgan', 'Dan Peretti', 'Kate Campbell', 'Matthew Young']
  const { templates } = useTemplatesStore()
  const [tab, setTab] = useState('details')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...lead })
  const [logEntry, setLogEntry] = useState('')
  const [logTemplate, setLogTemplate] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Replace form state
  const [replaceForm, setReplaceForm] = useState({
    company: '',
    contact: '',
    email: '',
    niche: lead.niche || 'Restaurant',
    city: lead.city || '',
    state: lead.state || '',
  })
  const [replacing, setReplacing] = useState(false)
  const [replaceError, setReplaceError] = useState('')

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSave = async () => {
    // If marked as Lost → move to Lost tab and close
    if (form.status === 'Lost') {
      await markLost(lead.id)
      onClose()
      return
    }
    updateLead(lead.id, form)
    setEditing(false)
  }

  const handleReplaceSubmit = async () => {
    if (!replaceForm.company.trim() || !replaceForm.email.trim()) {
      setReplaceError('Company Name and Email are required.')
      return
    }
    setReplacing(true)
    setReplaceError('')
    try {
      // 1. Mark current lead as Lost and add note
      const oldNote = lead.notes || ''
      const newNote = oldNote + `\n[Sold Business on ${new Date().toLocaleDateString()} - New Owner: ${replaceForm.contact || 'Unknown'} (${replaceForm.email})]`
      await updateLead(lead.id, { status: 'Lost', notes: newNote })
      await markLost(lead.id)

      // 2. Create the new lead
      await addLead({
        company: replaceForm.company.trim(),
        contact: replaceForm.contact.trim() || 'Business Owner',
        email: replaceForm.email.trim(),
        niche: replaceForm.niche,
        city: replaceForm.city,
        state: replaceForm.state,
        status: 'New',
        dealStage: 'New',
      })
      
      onClose()
    } catch (err) {
      setReplaceError(err.message || 'An error occurred.')
    } finally {
      setReplacing(false)
    }
  }

  const handleAddLog = () => {
    if (!logEntry.trim()) return
    const entry = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      text: logEntry.trim(),
      templateUsed: logTemplate || '',
    }
    const updated = [...(form.outreachLog || []), entry]
    set('outreachLog', updated)
    updateLead(lead.id, { outreachLog: updated })
    setLogEntry('')
    setLogTemplate('')
  }

  const handleDelete = () => {
    deleteLead(lead.id)
    onClose()
  }

  const TABS = ['details', 'notes', 'outreach', 'replace']

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-gray-900 border-l border-gray-700 flex flex-col h-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white font-semibold text-base truncate">{lead.company}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColors[lead.status] || 'text-gray-400'}`}>
                {lead.status}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">{lead.contact} · {lead.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none flex-shrink-0">✕</button>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 border-b border-gray-800">
          {[
            { label: 'Stage', value: lead.dealStage, color: stageColors[lead.dealStage] },
            { label: 'Deal Value', value: lead.dealValue > 0 ? `$${lead.dealValue}` : '—', color: 'text-orange-400' },
            { label: 'Follow Ups', value: lead.followUpCount, color: lead.followUpCount > 2 ? 'text-yellow-400' : 'text-gray-300' },
          ].map(s => (
            <div key={s.label} className="px-4 py-3 text-center border-r border-gray-800 last:border-r-0">
              <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-800">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 ${
                tab === t
                  ? 'text-orange-400 border-orange-500'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >{t === 'replace' ? '🔄 Replace (Sold)' : t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── DETAILS TAB ── */}
          {tab === 'details' && (
            <div className="p-5 flex flex-col gap-4">
              {editing ? (
                <>
                  <EditSection title="Contact">
                    <EditRow>
                      <EditField label="Company" value={form.company} onChange={v => set('company', v)} />
                      <EditField label="Contact" value={form.contact} onChange={v => set('contact', v)} />
                    </EditRow>
                    <EditRow>
                      <EditField label="Email" value={form.email} onChange={v => set('email', v)} />
                      <EditField label="Title" value={form.title} onChange={v => set('title', v)} />
                    </EditRow>
                  </EditSection>
                  <EditSection title="Location">
                    <EditRow>
                      <EditField label="City" value={form.city} onChange={v => set('city', v)} />
                      <EditField label="State" value={form.state} onChange={v => set('state', v)} />
                    </EditRow>
                  </EditSection>
                  <EditSection title="Deal">
                    <EditRow>
                      <EditSelect label="Niche" value={form.niche} onChange={v => set('niche', v)} options={NICHES} />
                      <EditSelect label="Status" value={form.status} onChange={v => set('status', v)} options={STATUSES} />
                    </EditRow>
                    <EditRow>
                      <EditSelect label="Stage" value={form.dealStage} onChange={v => set('dealStage', v)} options={STAGES} />
                      <EditField label="Deal Value ($)" value={form.dealValue} onChange={v => set('dealValue', v)} type="number" />
                    </EditRow>
                  </EditSection>
                  <EditSection title="Outreach">
                    <EditRow>
                      <EditSelect label="Sender" value={form.lastSender} onChange={v => set('lastSender', v)} options={['', ...senderNames]} />
                      <EditField label="Follow Up Date" value={form.followUpDate} onChange={v => set('followUpDate', v)} type="date" />
                    </EditRow>
                    <EditRow>
                      <EditField label="PDF Link" value={form.pdfLink} onChange={v => set('pdfLink', v)} />
                      <EditField label="AI Personalization" value={form.aiPersonalization} onChange={v => set('aiPersonalization', v)} />
                    </EditRow>
                  </EditSection>
                </>
              ) : (
                <>
                  <InfoSection title="Contact Info" rows={[
                    ['Company', lead.company],
                    ['Contact', lead.contact],
                    ['Email', lead.email],
                    ['Title', lead.title],
                  ]} />
                  <InfoSection title="Location" rows={[
                    ['City', lead.city],
                    ['State', lead.state],
                    ['Timezone', lead.timezone],
                  ]} />
                  <InfoSection title="Deal" rows={[
                    ['Niche', lead.niche],
                    ['Status', lead.status],
                    ['Stage', lead.dealStage],
                    ['Deal Value', lead.dealValue > 0 ? `$${lead.dealValue}` : '—'],
                    ['Pitch Sent', lead.pitchSent ? 'Yes' : 'No'],
                  ]} />
                  <InfoSection title="Outreach" rows={[
                    ['Last Sender', lead.lastSender || '—'],
                    ['Last Contacted', lead.lastContacted || '—'],
                    ['Follow Up Date', lead.followUpDate || '—'],
                    ['Follow Up Count', lead.followUpCount],
                  ]} />
                  {(lead.pdfLink || lead.aiPersonalization) && (
                    <InfoSection title="Campaign Assets" rows={[
                      ['PDF Link', lead.pdfLink ? <a href={lead.pdfLink} target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">📄 Open PDF</a> : '—'],
                      ['AI Personalization', lead.aiPersonalization || '—'],
                    ]} />
                  )}
                </>
              )}
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {tab === 'notes' && (
            <div className="p-5">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3">Notes</p>
              <textarea
                value={form.notes || ''}
                onChange={e => set('notes', e.target.value)}
                onBlur={() => updateLead(lead.id, { notes: form.notes })}
                placeholder="Type notes about this lead here. Auto-saves when you click away..."
                rows={12}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
              />
              <p className="text-gray-600 text-xs mt-2">Auto-saves on blur</p>
            </div>
          )}

          {/* ── OUTREACH LOG TAB ── */}
          {tab === 'outreach' && (
            <div className="p-5 flex flex-col gap-4">
              {/* Add entry */}
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Add Log Entry</p>
                <div className="flex flex-col gap-2">
                  <select
                    value={logTemplate}
                    onChange={e => setLogTemplate(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">— Template used (optional) —</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      value={logEntry}
                      onChange={e => setLogEntry(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddLog()}
                      placeholder="e.g. Sent intro email via Skinner..."
                      className="flex-1 bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={handleAddLog}
                      className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                    >+ Add</button>
                  </div>
                </div>
              </div>

              {/* Log entries */}
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">History</p>
                {(form.outreachLog || []).length === 0 ? (
                  <p className="text-gray-600 text-sm">No outreach logged yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {[...(form.outreachLog || [])].reverse().map((entry, i) => (
                      <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-orange-400 text-xs font-medium">{entry.date}</span>
                          <span className="text-gray-600 text-xs">{entry.time}</span>
                        </div>
                        {entry.templateUsed && (
                          <div className="mb-1.5">
                            <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
                              📧 {entry.templateUsed}
                            </span>
                          </div>
                        )}
                        <p className="text-gray-300 text-sm">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ── REPLACE (SOLD) TAB ── */}
          {tab === 'replace' && (
            <div className="p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-white font-semibold text-sm mb-1">Business Sold / Contact Change</h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Mark this current lead as <strong>Lost</strong> (with a record note) and automatically create a new lead for the new owner.
                </p>
              </div>

              {replaceError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-red-400 text-xs">
                  {replaceError}
                </div>
              )}

              <div className="flex flex-col gap-3 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">New Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Chicken Chef"
                    value={replaceForm.company}
                    onChange={e => setReplaceForm(f => ({ ...f, company: e.target.value }))}
                    className="bg-gray-850 border border-gray-700 text-gray-105 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">New Owner/Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dean"
                    value={replaceForm.contact}
                    onChange={e => setReplaceForm(f => ({ ...f, contact: e.target.value }))}
                    className="bg-gray-850 border border-gray-700 text-gray-105 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">New Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. dean@chickenchef.com"
                    value={replaceForm.email}
                    onChange={e => setReplaceForm(f => ({ ...f, email: e.target.value }))}
                    className="bg-gray-850 border border-gray-700 text-gray-105 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">City</label>
                    <input
                      type="text"
                      value={replaceForm.city}
                      onChange={e => setReplaceForm(f => ({ ...f, city: e.target.value }))}
                      className="bg-gray-850 border border-gray-700 text-gray-105 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">State</label>
                    <input
                      type="text"
                      value={replaceForm.state}
                      onChange={e => setReplaceForm(f => ({ ...f, state: e.target.value }))}
                      className="bg-gray-850 border border-gray-700 text-gray-105 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Niche</label>
                  <select
                    value={replaceForm.niche}
                    onChange={e => setReplaceForm(f => ({ ...f, niche: e.target.value }))}
                    className="bg-gray-850 border border-gray-700 text-gray-105 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={handleReplaceSubmit}
                disabled={replacing}
                className="mt-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white font-medium text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {replacing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  '🔄 Mark Sold & Create New Lead'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 w-full">
              <p className="text-red-400 text-xs flex-1">Delete this lead permanently?</p>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5">Cancel</button>
              <button onClick={handleDelete} className="text-xs text-white bg-red-600 hover:bg-red-500 rounded-lg px-3 py-1.5">Delete</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >🗑 Delete lead</button>
              <button
                onClick={() => { promoteClient(lead.id); onClose() }}
                className="text-xs text-gray-600 hover:text-orange-400 border border-gray-700 hover:border-orange-500 rounded-lg px-3 py-1.5 transition-colors"
              >💰 Promote to Client</button>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} className="text-xs border border-gray-700 text-gray-400 hover:text-white rounded-lg px-3 py-1.5 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="text-xs bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-4 py-1.5 transition-colors">Save changes</button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg px-4 py-1.5 transition-colors">✏️ Edit</button>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}


// ── Helpers ─────────────────────────────────────────────
function InfoSection({ title, rows }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">{title}</p>
      <div className="bg-gray-800/50 border border-gray-800 rounded-lg overflow-hidden">
        {rows.map(([label, value], i) => (
          <div key={i} className={`flex justify-between px-3 py-2 text-sm ${i < rows.length - 1 ? 'border-b border-gray-800' : ''}`}>
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-200 text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EditSection({ title, children }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function EditRow({ children }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

function EditField({ label, value, onChange, type = 'text' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500" />
    </div>
  )
}

function EditSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500">
        {options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
      </select>
    </div>
  )
}