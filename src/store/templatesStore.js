import { create } from 'zustand'
import { sheetsApi } from '../lib/sheetsApi'

const DEFAULTS = [
  {
    "variant": "Variant A (Conversational Question)",
    "id": "proptech-variant-a",
    "name": "Variant A \u2014 PropTech Companies (Soft Question)",
    "niche": "PropTech",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in property technology & software solutions.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "proptech-variant-b",
    "name": "Variant B \u2014 PropTech Companies (Partner Offer)",
    "niche": "PropTech",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable property technology & software solutions providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "proptech-variant-c",
    "name": "Variant C \u2014 PropTech Companies (Direct Sourcing)",
    "niche": "PropTech",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help PropTech teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant A (Conversational Question)",
    "id": "hvac-variant-a",
    "name": "Variant A \u2014 HVAC Vendors (Soft Question)",
    "niche": "HVAC Vendors",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in HVAC & commercial mechanical services.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "hvac-variant-b",
    "name": "Variant B \u2014 HVAC Vendors (Partner Offer)",
    "niche": "HVAC Vendors",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable HVAC & commercial mechanical services providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "hvac-variant-c",
    "name": "Variant C \u2014 HVAC Vendors (Direct Sourcing)",
    "niche": "HVAC Vendors",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help HVAC Vendors teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant A (Conversational Question)",
    "id": "roofing-variant-a",
    "name": "Variant A \u2014 Roofing Vendors (Soft Question)",
    "niche": "Roofing Vendors",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in commercial roofing & property restoration.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "roofing-variant-b",
    "name": "Variant B \u2014 Roofing Vendors (Partner Offer)",
    "niche": "Roofing Vendors",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable commercial roofing & property restoration providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "roofing-variant-c",
    "name": "Variant C \u2014 Roofing Vendors (Direct Sourcing)",
    "niche": "Roofing Vendors",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help Roofing Vendors teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant A (Conversational Question)",
    "id": "insurance-variant-a",
    "name": "Variant A \u2014 Insurance Providers (Soft Question)",
    "niche": "Insurance Providers",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in commercial property insurance & risk solutions.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "insurance-variant-b",
    "name": "Variant B \u2014 Insurance Providers (Partner Offer)",
    "niche": "Insurance Providers",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable commercial property insurance & risk solutions providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "insurance-variant-c",
    "name": "Variant C \u2014 Insurance Providers (Direct Sourcing)",
    "niche": "Insurance Providers",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help Insurance Providers teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant A (Conversational Question)",
    "id": "pest_control-variant-a",
    "name": "Variant A \u2014 Pest Control Companies (Soft Question)",
    "niche": "Pest Control",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in commercial pest management & extermination services.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "pest_control-variant-b",
    "name": "Variant B \u2014 Pest Control Companies (Partner Offer)",
    "niche": "Pest Control",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable commercial pest management & extermination services providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "pest_control-variant-c",
    "name": "Variant C \u2014 Pest Control Companies (Direct Sourcing)",
    "niche": "Pest Control",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help Pest Control teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant A (Conversational Question)",
    "id": "elevator-variant-a",
    "name": "Variant A \u2014 Elevator Companies (Soft Question)",
    "niche": "Elevator Services",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in elevator maintenance & modernization services.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "elevator-variant-b",
    "name": "Variant B \u2014 Elevator Companies (Partner Offer)",
    "niche": "Elevator Services",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable elevator maintenance & modernization services providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "elevator-variant-c",
    "name": "Variant C \u2014 Elevator Companies (Direct Sourcing)",
    "niche": "Elevator Services",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help Elevator Services teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant A (Conversational Question)",
    "id": "multifamily_marketing-variant-a",
    "name": "Variant A \u2014 Multifamily Marketing Agencies (Soft Question)",
    "niche": "Multifamily Marketing",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in apartment & multifamily marketing solutions.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "multifamily_marketing-variant-b",
    "name": "Variant B \u2014 Multifamily Marketing Agencies (Partner Offer)",
    "niche": "Multifamily Marketing",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable apartment & multifamily marketing solutions providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "multifamily_marketing-variant-c",
    "name": "Variant C \u2014 Multifamily Marketing Agencies (Direct Sourcing)",
    "niche": "Multifamily Marketing",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help Multifamily Marketing teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant A (Conversational Question)",
    "id": "resident_amenities-variant-a",
    "name": "Variant A \u2014 Resident Amenity Providers (Soft Question)",
    "niche": "Resident Amenities",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in resident perk & amenity services.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "resident_amenities-variant-b",
    "name": "Variant B \u2014 Resident Amenity Providers (Partner Offer)",
    "niche": "Resident Amenities",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable resident perk & amenity services providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "resident_amenities-variant-c",
    "name": "Variant C \u2014 Resident Amenity Providers (Direct Sourcing)",
    "niche": "Resident Amenities",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help Resident Amenities teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant A (Conversational Question)",
    "id": "internet_providers-variant-a",
    "name": "Variant A \u2014 Internet Providers (Soft Question)",
    "niche": "Internet Providers",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in bulk MDU telecom & high-speed internet services.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "internet_providers-variant-b",
    "name": "Variant B \u2014 Internet Providers (Partner Offer)",
    "niche": "Internet Providers",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable bulk MDU telecom & high-speed internet services providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "internet_providers-variant-c",
    "name": "Variant C \u2014 Internet Providers (Direct Sourcing)",
    "niche": "Internet Providers",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help Internet Providers teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant A (Conversational Question)",
    "id": "security_access-variant-a",
    "name": "Variant A \u2014 Security & Access Control Vendors (Soft Question)",
    "niche": "Security & Access Control",
    "type": "Cold",
    "subject": "quick question regarding {city}",
    "body": "Hi {firstName|there},\n\nI came across {company|your team} and noticed your work in access control & property security solutions.\n\nWe recently compiled a verified contact list of local Property Managers & HOA decision-makers in {city|your target market}.\n\nAre you currently looking to connect or partner with property managers in {city|your area} right now?\n\nIf so, let me know and I'd be glad to send over a quick preview for your team to take a look at.\n\nBest regards,\n{senderName}"
  },
  {
    "variant": "Variant B (Partner / Referral Angle)",
    "id": "security_access-variant-b",
    "name": "Variant B \u2014 Security & Access Control Vendors (Partner Offer)",
    "niche": "Security & Access Control",
    "type": "Cold",
    "subject": "property manager partner in {city}",
    "body": "Hi {firstName|there},\n\nReaching out because we frequently get asked by local Property Managers in {city|your area} for reliable access control & property security solutions providers.\n\nWe have a verified list of active PM decision-makers looking for new vendor partners.\n\nWould it be helpful if I shared a sample list of these PM contacts for {company|your team} to review?\n\nBest,\n{senderName}"
  },
  {
    "variant": "Variant C (Direct Problem-Solver)",
    "id": "security_access-variant-c",
    "name": "Variant C \u2014 Security & Access Control Vendors (Direct Sourcing)",
    "niche": "Security & Access Control",
    "type": "Cold",
    "subject": "connecting with {city} PMs",
    "body": "Hi {firstName|there},\n\nQuick note \u2014 we help Security & Access Control teams reach direct Property Manager & HOA decision-makers faster without outdated directories.\n\nWe have a fresh list of verified PM contacts in {city|your market} ready.\n\nWorth a 10-second look at a sample preview?\n\nBest regards,\n{senderName}"
  }
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
