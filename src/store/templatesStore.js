import { create } from 'zustand'
import { sheetsApi } from '../lib/sheetsApi'

const DEFAULTS = [
  { id: 'default-1', name: 'Cold Intro — Dental', niche: 'Dental', type: 'Cold',
    subject: 'Quick question about your patient list, {{firstName}}',
    body: `Hi {{firstName}},\n\nI came across {{company}} and wanted to reach out directly.\n\nWe help dental practices get verified contact lists of local patients and referral sources — so your team spends less time prospecting and more time closing.\n\nWe recently helped a practice in {{city}} add 47 new patient leads in one week.\n\nWould a list of 100 verified contacts in {{city}} be useful for your team?\n\nHappy to send over a sample.\n\nBest,\n{{senderName}}`, createdAt: '' },
  { id: 'default-2', name: 'Follow Up #1 — General', niche: 'All', type: 'Follow Up',
    subject: 'Re: Quick question',
    body: `Hi {{firstName}},\n\nJust wanted to make sure this didn't get buried.\n\nWe have a verified list of 100 contacts in {{city}} ready to go — priced at $147 flat.\n\nNo subscription, no upsells. One payment, yours to keep.\n\nWorth a quick look?\n\n{{senderName}}`, createdAt: '' },
  { id: 'default-3', name: 'Closing — Property Managers', niche: 'Real Estate', type: 'Closing',
    subject: '100 BC property manager contacts — $147',
    body: `Hi {{firstName}},\n\nFollowing up on the BC property manager list we discussed.\n\n100 verified contacts, ready to send today — $147 flat.\n\nIf you want to move forward, just reply "yes" and I'll send the invoice over.\n\n{{senderName}}`, createdAt: '' },
  { id: 'default-4', name: 'Re-engagement — Cold Lead', niche: 'All', type: 'Re-engagement',
    subject: 'Still interested in {{city}} leads?',
    body: `Hi {{firstName}},\n\nI know timing isn't always right — just wanted to check in one last time.\n\nWe still have a verified list of 100 {{niche}} contacts in {{city}} available.\n\nIf it's not a fit right now, no worries at all. But if you'd like to take a look, just reply and I'll send the details over.\n\n{{senderName}}`, createdAt: '' },
  { id: 'default-5', name: 'Cold Intro — SaaS', niche: 'SaaS', type: 'Cold',
    subject: 'Verified SaaS buyer contacts for {{company}}',
    body: `Hi {{firstName}},\n\nQuick one — we build verified contact lists for SaaS companies looking to reach decision-makers faster.\n\nWe can put together 100 verified contacts in your target market for $147 flat.\n\nWould that be useful for your outreach this quarter?\n\n{{senderName}}`, createdAt: '' },
]

export const useTemplatesStore = create((set, get) => ({
  templates: DEFAULTS,
  loading:   false,
  error:     null,

  loadTemplates: async () => {
    // Load from cache first for instant display
    try {
      const cached = localStorage.getItem('bdl_cache_templates')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed && parsed.length > 0) {
          set({ templates: parsed, loading: false, error: null })
        }
      }
    } catch (e) { /* ignore cache errors */ }

    set(s => ({ loading: true, error: s.error }))
    try {
      const data = await sheetsApi.getTemplates()
      if (data.error) throw new Error(data.error)
      const fromSheets = data.templates || []
      const final = fromSheets.length > 0 ? fromSheets : DEFAULTS
      set({ templates: final, loading: false })
      try { localStorage.setItem('bdl_cache_templates', JSON.stringify(final)) } catch(e) {}
    } catch (err) {
      set(s => ({ error: err.message, loading: false, templates: s.templates.length > 0 ? s.templates : DEFAULTS }))
    }
  },

  addTemplate: async (template) => {
    const newT = { ...template, id: 'tpl-' + Date.now().toString(36), createdAt: new Date().toISOString() }
    set(s => ({ templates: [...s.templates, newT] }))
    try { await sheetsApi.saveTemplate(newT) } catch (err) { console.error('Save template failed:', err) }
    return newT
  },

  updateTemplate: async (id, changes) => {
    set(s => ({ templates: s.templates.map(t => t.id === id ? { ...t, ...changes } : t) }))
    try {
      const updated = get().templates.find(t => t.id === id)
      if (updated) await sheetsApi.saveTemplate(updated)
    } catch (err) { console.error('Update template failed:', err) }
  },

  deleteTemplate: async (id) => {
    set(s => ({ templates: s.templates.filter(t => t.id !== id) }))
    try { await sheetsApi.deleteTemplate(id) } catch (err) { console.error('Delete template failed:', err) }
  },
}))
