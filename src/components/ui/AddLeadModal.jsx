import { useState } from 'react'
import { useLeadsStore } from '../../store/leadsStore'

const NICHES = [
  'Dentist',
  'HVAC Specialist',
  'Roofer',
  'Plumber',
  'Chiropractor',
  'Solar Installer',
  'Law Firm',
  'Auto Repair',
  'Restaurant',
  'Lodging',
  'CPA / Accountant',
  'Real Estate Agent',
  'Junk Removal',
  'Healthcare Staffing',
  'Education'
]
const STATUSES = ['New', 'Warm', 'Cold']
const STAGES = ['New', 'Pitched', 'Negotiating', 'Closed', 'Cold']
const TIMEZONES = ['EST', 'CST', 'MST', 'PST']

export default function AddLeadModal({ onClose }) {
  const { leads, addLead, senders } = useLeadsStore()
  const senderNames = senders && senders.length > 0 ? senders.map(s => s.name) : ['Skinner Donald', 'Michael Brauns', 'Lyle Morgan', 'Dan Peretti', 'Kate Campbell', 'Matthew Young']

  const [form, setForm] = useState({
    company: '', contact: '', email: '', title: '',
    niche: 'Restaurant', status: 'New', dealStage: 'New',
    city: '', state: '', timezone: 'CST',
    lastSender: '', followUpDate: '', dealValue: '',
    pitchSent: false, notes: '',
  })

  const [errors, setErrors] = useState({})

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.company.trim()) e.company = 'Required'
    if (!form.contact.trim()) e.contact = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    addLead({
      id: Date.now().toString(),
      num: leads.length + 1,
      ...form,
      dealValue: parseFloat(form.dealValue) || 0,
      followUpCount: 0,
      lastContacted: null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div>
            <h2 className="text-white font-semibold text-lg">Add New Lead</h2>
            <p className="text-gray-500 text-xs mt-0.5">Fill in the lead details below</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          >✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Section: Contact Info */}
          <Section title="Contact Info">
            <Row>
              <Field label="Company *" error={errors.company}>
                <Input value={form.company} onChange={v => set('company', v)} placeholder="Bright Smile Dental" />
              </Field>
              <Field label="Contact Name *" error={errors.contact}>
                <Input value={form.contact} onChange={v => set('contact', v)} placeholder="Dr. Sarah Collins" />
              </Field>
            </Row>
            <Row>
              <Field label="Email *" error={errors.email}>
                <Input value={form.email} onChange={v => set('email', v)} placeholder="sarah@brightsmile.com" type="email" />
              </Field>
              <Field label="Title">
                <Input value={form.title} onChange={v => set('title', v)} placeholder="Owner" />
              </Field>
            </Row>
          </Section>

          {/* Section: Location */}
          <Section title="Location">
            <Row>
              <Field label="City">
                <Input value={form.city} onChange={v => set('city', v)} placeholder="Austin" />
              </Field>
              <Field label="State">
                <Input value={form.state} onChange={v => set('state', v)} placeholder="TX" />
              </Field>
              <Field label="Timezone">
                <Select value={form.timezone} onChange={v => set('timezone', v)} options={TIMEZONES} />
              </Field>
            </Row>
          </Section>

          {/* Section: Deal Info */}
          <Section title="Deal Info">
            <Row>
              <Field label="Niche">
                <Select value={form.niche} onChange={v => set('niche', v)} options={NICHES} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={v => set('status', v)} options={STATUSES} />
              </Field>
              <Field label="Deal Stage">
                <Select value={form.dealStage} onChange={v => set('dealStage', v)} options={STAGES} />
              </Field>
            </Row>
            <Row>
              <Field label="Deal Value ($)">
                <Input value={form.dealValue} onChange={v => set('dealValue', v)} placeholder="147" type="number" />
              </Field>
              <Field label="Follow Up Date">
                <Input value={form.followUpDate} onChange={v => set('followUpDate', v)} type="date" />
              </Field>
            </Row>
          </Section>

          {/* Section: Outreach */}
          <Section title="Outreach">
            <Row>
              <Field label="Assigned Sender">
                <Select value={form.lastSender} onChange={v => set('lastSender', v)} options={['', ...senderNames]} />
              </Field>
              <Field label="Pitch Sent?">
                <div className="flex items-center gap-3 mt-2">
                  {['Yes', 'No'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => set('pitchSent', opt === 'Yes')}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                        (form.pitchSent && opt === 'Yes') || (!form.pitchSent && opt === 'No')
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >{opt}</button>
                  ))}
                </div>
              </Field>
            </Row>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any extra context about this lead..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
              />
            </Field>
          </Section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 sticky bottom-0 bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
          >Cancel</button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
          >Add Lead</button>
        </div>

      </div>
    </div>
  )
}

// ── Small helper components ──────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Row({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
}

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-orange-500"
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
    >
      {options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
    </select>
  )
}