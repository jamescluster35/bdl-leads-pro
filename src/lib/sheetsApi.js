const SHEET_URL = import.meta.env.VITE_API_URL || 'https://bdl.dataconnectmail.com/api'

async function call(body) {
  const password = localStorage.getItem('bdl_password') || '';
  const res = await fetch(SHEET_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...body, key: password }),
  })
  return res.json()
}

export const sheetsApi = {
  // Get all tabs at once
  getAll: () => call({ action: 'getAll' }),

  // Add new lead to Leads tab
  addLead: (lead) => call({ action: 'addLead', lead }),

  // Update lead in any tab
  updateLead: (id, changes, tab = 'Leads') =>
    call({ action: 'updateLead', id, changes, tab }),

  // Archive lead (Leads → Archived)
  archiveLead: (id) => call({ action: 'archiveLead', id }),

  // Promote to client (Leads → Clients)
  promoteClient: (id) => call({ action: 'promoteClient', id }),

  // Restore lead back to Leads
  restoreLead: (id, fromTab) => call({ action: 'restoreLead', id, fromTab }),

  // Delete lead (any tab → Deleted)
  deleteLead: (id, fromTab) => call({ action: 'deleteLead', id, fromTab }),

  // Mark as Lost (Leads → Lost tab)
  markAsLost: (id, fromTab = 'Leads') => call({ action: 'markAsLost', id, fromTab }),

  // Restore from Lost → Leads
  restoreFromLost: (id) => call({ action: 'restoreFromLost', id }),

  // Move between any tabs
  moveLead: (id, fromTab, toTab, changes = {}) =>
    call({ action: 'moveLead', id, fromTab, toTab, changes }),

  // ── Templates ────────────────────────────────────────
  getTemplates:  ()         => call({ action: 'getTemplates' }),
  saveTemplate:  (template) => call({ action: 'saveTemplate', template }),
  deleteTemplate:(id)       => call({ action: 'deleteTemplate', id }),

  // ── Senders ──────────────────────────────────────────
  getSenders:    ()         => call({ action: 'getSenders' }),
  saveSenders:   (senders)  => call({ action: 'saveSenders', senders }),

  // ── Gmail Ingestion & Sync ──────────────────────────
  getGmailInboxFeed: ()     => call({ action: 'getGmailInboxFeed' }),
  processGmailThread: (threadId) => call({ action: 'processGmailThread', threadId }),
  syncOutreachLogsFromGmail: () => call({ action: 'syncOutreachLogsFromGmail' }),
  sendCalculatorLink: (threadId) => call({ action: 'sendCalculatorLink', threadId }),
  getIngestionSettings: () => call({ action: 'getIngestionSettings' }),
  saveIngestionSettings: (searchQuery) => call({ action: 'saveIngestionSettings', searchQuery }),
  
  // ── Multi-Account Connected Inboxes ──────────────────
  getOAuthCredentials: () => call({ action: 'getOAuthCredentials' }),
  saveOAuthCredentials: (clientId, clientSecret) => call({ action: 'saveOAuthCredentials', clientId, clientSecret }),
  getConnectedAccounts: () => call({ action: 'getConnectedAccounts' }),
  generateAuthUrl: (email) => call({ action: 'generateAuthUrl', email }),
  deleteConnectedAccount: (email) => call({ action: 'deleteConnectedAccount', email }),

  // ── Reminders ────────────────────────────────────────
  setupRemindersTrigger: () => call({ action: 'setupRemindersTrigger' }),
  sendFollowUpReminders: () => call({ action: 'sendFollowUpReminders' }),

  // ── Calculator Leads (Inbound) ───────────────────────
  getCalculatorLeads: () => call({ action: 'getCalculatorLeads' }),
  updateCalculatorLead: (id, changes) => call({ action: 'updateCalculatorLead', id, changes }),
  deleteCalculatorLead: (id) => call({ action: 'deleteCalculatorLead', id }),
  
  // ── PDF Audit Drive Sync ──────────────────────────────
  saveLeadPdfToDrive: (leadId, pdfType, note) => call({ action: 'saveLeadPdfToDrive', leadId, pdfType, note }),

  // ── Campaign Manager — Cold Outreach ─────────────────
  sendColdOutreach: (payload) => call({ action: 'sendColdOutreach', ...payload }),
}