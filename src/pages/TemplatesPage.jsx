import { useState } from 'react'
import { useTemplatesStore } from '../store/templatesStore'

const TYPES  = ['All', 'Cold', 'Follow Up', 'Closing', 'Re-engagement']
const NICHES = ['All', 'Property Management', 'PropTech', 'HVAC Vendor', 'Roofing Vendor', 'Insurance Provider', 'Pest Control', 'Elevator Services', 'Multifamily Marketing', 'Resident Amenity Provider', 'Internet Provider', 'Security & Access Control', 'Wastewater & Septic', 'Equipment Financing']
const TYPE_COLORS = {
  'Cold':          'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Follow Up':     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Closing':       'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Re-engagement': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export default function TemplatesPage() {
  const { templates, loading, addTemplate, updateTemplate, deleteTemplate } = useTemplatesStore()

  const [selected,    setSelected]    = useState(null)
  const [filterType,  setFilterType]  = useState('All')
  const [filterNiche, setFilterNiche] = useState('All')
  const [editing,     setEditing]     = useState(false)
  const [editForm,    setEditForm]    = useState(null)
  const [copied,      setCopied]      = useState('')
  const [showNew,     setShowNew]     = useState(false)
  const [newForm,     setNewForm]     = useState({ name: '', niche: 'All', type: 'Cold', subject: '', body: '' })
  const [saving,      setSaving]      = useState(false)

  const displaySelected = selected ?? (templates.length > 0 ? templates[0] : null)

  const filtered = templates.filter(t => {
    const matchType  = filterType  === 'All' || t.type  === filterType
    const matchNiche = filterNiche === 'All' || t.niche === filterNiche || t.niche === 'All'
    return matchType && matchNiche
  })

  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 1800)
  }

  const startEdit = () => { setEditForm({ ...displaySelected }); setEditing(true) }

  const saveEdit = async () => {
    setSaving(true)
    await updateTemplate(editForm.id, editForm)
    setSelected(editForm)
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!displaySelected) return
    await deleteTemplate(displaySelected.id)
    setSelected(null)
    setEditing(false)
  }

  const saveNew = async () => {
    if (!newForm.name.trim() || !newForm.subject.trim()) return
    setSaving(true)
    const created = await addTemplate(newForm)
    setSelected(created)
    setShowNew(false)
    setNewForm({ name: '', niche: 'All', type: 'Cold', subject: '', body: '' })
    setSaving(false)
  }

  return (
    <div className="flex h-full">

      {/* Left — template list */}
      <div className="w-72 border-r border-gray-800 flex flex-col h-screen sticky top-0">
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-white font-semibold text-base">Templates</h1>
              {loading && <p className="text-gray-600 text-xs">Syncing...</p>}
            </div>
            <button onClick={() => setShowNew(true)} className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-2.5 py-1.5 rounded-lg transition-colors">+ New</button>
          </div>
          <div className="flex flex-col gap-2">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500">
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={filterNiche} onChange={e => setFilterNiche(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500">
              {NICHES.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {filtered.map(t => (
            <button key={t.id} onClick={() => { setSelected(t); setEditing(false) }}
              className={`w-full text-left px-4 py-3 border-b border-gray-800/50 transition-colors hover:bg-gray-800/50 ${displaySelected?.id === t.id ? 'bg-gray-800 border-l-2 border-l-orange-500' : ''}`}>
              <p className="text-white text-xs font-medium truncate mb-1">{t.name}</p>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-xs border ${TYPE_COLORS[t.type] || 'text-gray-400'}`}>{t.type}</span>
                <span className="text-gray-600 text-xs">{t.niche}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-gray-600 text-xs text-center py-8">No templates match filters.</p>}
        </div>
      </div>

      {/* Right — template detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!displaySelected ? (
          <div className="text-center py-20"><p className="text-4xl mb-3">✉️</p><p className="text-gray-500 text-sm">Select a template to view it</p></div>
        ) : editing ? (
          <div className="max-w-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Edit Template</h2>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs border border-gray-700 text-gray-400 rounded-lg px-3 py-1.5 hover:text-white transition-colors">Cancel</button>
                <button onClick={saveEdit} disabled={saving} className="text-xs bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-4 py-1.5 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
            <Field label="Template Name"><Input value={editForm.name} onChange={v => setEditForm(f => ({...f, name: v}))} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type"><Sel value={editForm.type} onChange={v => setEditForm(f => ({...f, type: v}))} options={TYPES.slice(1)} /></Field>
              <Field label="Niche"><Sel value={editForm.niche} onChange={v => setEditForm(f => ({...f, niche: v}))} options={NICHES} /></Field>
            </div>
            <Field label="Subject Line"><Input value={editForm.subject} onChange={v => setEditForm(f => ({...f, subject: v}))} /></Field>
            <Field label="Body">
              <textarea value={editForm.body} onChange={e => setEditForm(f => ({...f, body: e.target.value}))} rows={14}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 resize-none font-mono" />
            </Field>
          </div>
        ) : (
          <div className="max-w-2xl">
            <div className="flex items-start justify-between mb-5 gap-3">
              <div>
                <h2 className="text-white font-semibold text-lg">{displaySelected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs border ${TYPE_COLORS[displaySelected.type] || 'text-gray-400'}`}>{displaySelected.type}</span>
                  <span className="text-gray-500 text-xs">{displaySelected.niche}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={startEdit} className="text-xs border border-gray-700 text-gray-400 hover:text-white rounded-lg px-3 py-1.5 transition-colors">✏️ Edit</button>
                <button onClick={handleDelete} className="text-xs border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-500/50 rounded-lg px-3 py-1.5 transition-colors">🗑</button>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 mb-5">
              <p className="text-xs text-gray-400 font-medium mb-1.5">Available variables</p>
              <div className="flex flex-wrap gap-1.5">
                {['{{firstName}}','{{company}}','{{city}}','{{niche}}','{{senderName}}'].map(v => (
                  <code key={v} className="text-xs bg-gray-700 text-orange-400 px-1.5 py-0.5 rounded">{v}</code>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Subject Line</p>
                <button onClick={() => copy(displaySelected.subject, 'subject')} className="text-xs text-gray-500 hover:text-orange-400 transition-colors">{copied === 'subject' ? '✓ Copied' : '⎘ Copy'}</button>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 text-sm">{displaySelected.subject}</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Email Body</p>
                <button onClick={() => copy(displaySelected.body, 'body')} className="text-xs text-gray-500 hover:text-orange-400 transition-colors">{copied === 'body' ? '✓ Copied' : '⎘ Copy'}</button>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-4 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed font-mono">{displaySelected.body}</div>
            </div>

            <button onClick={() => copy(`Subject: ${displaySelected.subject}\n\n${displaySelected.body}`, 'all')}
              className="mt-4 w-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
              {copied === 'all' ? '✓ Copied to clipboard!' : '⎘ Copy full email'}
            </button>

            {displaySelected.createdAt && (
              <p className="text-gray-700 text-xs mt-3 text-center">☁ Saved to Google Sheets · {new Date(displaySelected.createdAt).toLocaleDateString()}</p>
            )}
          </div>
        )}
      </div>

      {/* New template modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNew(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-white font-semibold">New Template</h3>
            <Field label="Name"><Input value={newForm.name} onChange={v => setNewForm(f => ({...f, name: v}))} placeholder="e.g. Cold Intro — Healthcare" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type"><Sel value={newForm.type} onChange={v => setNewForm(f => ({...f, type: v}))} options={TYPES.slice(1)} /></Field>
              <Field label="Niche"><Sel value={newForm.niche} onChange={v => setNewForm(f => ({...f, niche: v}))} options={NICHES} /></Field>
            </div>
            <Field label="Subject"><Input value={newForm.subject} onChange={v => setNewForm(f => ({...f, subject: v}))} placeholder="Subject line..." /></Field>
            <Field label="Body">
              <textarea value={newForm.body} onChange={e => setNewForm(f => ({...f, body: e.target.value}))} placeholder="Email body..." rows={6}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 resize-none" />
            </Field>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="text-xs border border-gray-700 text-gray-400 rounded-lg px-3 py-1.5 hover:text-white transition-colors">Cancel</button>
              <button onClick={saveNew} disabled={saving} className="text-xs bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-4 py-1.5 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Create Template'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return <div className="flex flex-col gap-1"><label className="text-xs text-gray-400">{label}</label>{children}</div>
}
function Input({ value, onChange, placeholder }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-orange-500" />
}
function Sel({ value, onChange, options }) {
  return <select value={value} onChange={e => onChange(e.target.value)}
    className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500">
    {options.map(o => <option key={o}>{o}</option>)}
  </select>
}