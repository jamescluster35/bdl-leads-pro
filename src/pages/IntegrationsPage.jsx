import { useState, useEffect, useRef } from 'react'
import { useLeadsStore } from '../store/leadsStore'
import { sheetsApi } from '../lib/sheetsApi'

export default function IntegrationsPage() {
  const { senders, saveSenders, loadAll } = useLeadsStore()
  
  // Gmail Inbox Feed state
  const [feed, setFeed] = useState([])
  const [loadingFeed, setLoadingFeed] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  
  // Search query settings state
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Senders editing state
  const [newSenderName, setNewSenderName] = useState('')
  const [editingSenderId, setEditingSenderId] = useState(null)
  const [editingSenderName, setEditingSenderName] = useState('')
  const [savingSenders, setSavingSenders] = useState(false)

  // OAuth & Connected Accounts state
  const [oauthClientId, setOauthClientId] = useState('')
  const [oauthClientSecret, setOauthClientSecret] = useState('')
  const [hasClientSecret, setHasClientSecret] = useState(false)
  const [loadingOAuth, setLoadingOAuth] = useState(false)
  const [savingOAuth, setSavingOAuth] = useState(false)
  
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [disconnectingEmail, setDisconnectingEmail] = useState(null)
  
  // Connect Modal state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [connectEmail, setConnectEmail] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStep, setConnectionStep] = useState('input') // 'input' | 'authorizing'
  
  // Ref to track popup and polling interval
  const authPopupRef = useRef(null)
  const pollIntervalRef = useRef(null)

  // Status/Notifications state
  const [notification, setNotification] = useState(null)

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  // Redirect URI is the Google Apps Script Web App URL
  const redirectUri = import.meta.env.VITE_REDIRECT_URI || 'https://script.google.com/macros/s/AKfycby9uH6uVHE6090gmKyqBfvEvc2Q0PD2J2J9nWxl0qqoA6yZFX9_aObsfeePVuf8Snzgow/exec'

  // Load Feed, Settings, OAuth, and Accounts on mount
  useEffect(() => {
    fetchFeed()
    fetchSettings()
    fetchOAuthCredentials()
    fetchConnectedAccounts()

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const fetchFeed = async () => {
    setLoadingFeed(true)
    try {
      const res = await sheetsApi.getGmailInboxFeed()
      if (res && res.success) {
        setFeed(res.feed || [])
      } else {
        console.error("Failed to fetch feed:", res?.error)
        showNotification(res?.error || "Failed to load Gmail feed", "error")
      }
    } catch (e) {
      console.error(e)
      showNotification("Network error loading feed", "error")
    } finally {
      setLoadingFeed(false)
    }
  }

  const fetchSettings = async () => {
    setLoadingSettings(true)
    try {
      const res = await sheetsApi.getIngestionSettings()
      if (res && res.success) {
        setSearchQuery(res.searchQuery || '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSettings(false)
    }
  }

  const fetchOAuthCredentials = async () => {
    setLoadingOAuth(true)
    try {
      const res = await sheetsApi.getOAuthCredentials()
      if (res && res.success) {
        setOauthClientId(res.clientId || '')
        setHasClientSecret(res.hasClientSecret || false)
        if (res.hasClientSecret) {
          setOauthClientSecret('••••••••••••••••')
        }
      }
    } catch (e) {
      console.error("Failed to load OAuth settings:", e)
    } finally {
      setLoadingOAuth(false)
    }
  }

  const fetchConnectedAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const res = await sheetsApi.getConnectedAccounts()
      if (res && res.success) {
        setConnectedAccounts(res.accounts || [])
      }
    } catch (e) {
      console.error("Failed to load connected accounts:", e)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const handleSaveOAuth = async (e) => {
    e.preventDefault()
    setSavingOAuth(true)
    try {
      // Don't send placeholder back if it wasn't edited
      const secretToSend = oauthClientSecret === '••••••••••••••••' ? '' : oauthClientSecret
      const res = await sheetsApi.saveOAuthCredentials(oauthClientId, secretToSend)
      if (res && res.success) {
        showNotification("Google App OAuth Credentials saved successfully")
        setHasClientSecret(true)
        setOauthClientSecret('••••••••••••••••')
      } else {
        showNotification(res?.error || "Failed to save OAuth credentials", "error")
      }
    } catch (err) {
      showNotification("Network error saving OAuth configuration", "error")
    } finally {
      setSavingOAuth(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const res = await sheetsApi.saveIngestionSettings(searchQuery)
      if (res && res.success) {
        showNotification("Ingestion search settings saved successfully")
      } else {
        showNotification(res?.error || "Failed to save settings", "error")
      }
    } catch (err) {
      showNotification("Network error saving settings", "error")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSyncOutreach = async () => {
    setSyncingAll(true)
    try {
      const syncRes = await sheetsApi.syncOutreachLogsFromGmail()
      if (syncRes && syncRes.success) {
        showNotification(`Synced outreach logs for ${syncRes.syncedLeadsCount} active leads`)
      } else {
        showNotification(syncRes?.error || "Outreach sync failed", "error")
      }
      await fetchFeed()
      await loadAll()
    } catch (e) {
      showNotification("Sync process failed", "error")
    } finally {
      setSyncingAll(false)
    }
  }

  const handleLinkLead = async (threadId) => {
    setActionLoading(prev => ({ ...prev, [threadId]: true }))
    try {
      const res = await sheetsApi.processGmailThread(threadId)
      if (res && res.success) {
        showNotification(`Lead successfully linked: ${res.parsedEmail}`)
        setFeed(prev => prev.filter(t => t.threadId !== threadId))
        await loadAll()
      } else {
        showNotification(res?.error || "Failed to link lead", "error")
      }
    } catch (e) {
      showNotification("Network error linking thread", "error")
    } finally {
      setActionLoading(prev => ({ ...prev, [threadId]: false }))
    }
  }

  const handleSendCalcLink = async (threadId) => {
    setActionLoading(prev => ({ ...prev, [threadId + '-send']: true }))
    try {
      const res = await sheetsApi.sendCalculatorLink(threadId)
      if (res && res.success) {
        showNotification("Calculator link reply sent successfully!")
        setFeed(prev => prev.filter(t => t.threadId !== threadId))
        await loadAll()
      } else {
        showNotification(res?.error || "Failed to send calculator link", "error")
      }
    } catch (e) {
      showNotification("Network error sending reply", "error")
    } finally {
      setActionLoading(prev => ({ ...prev, [threadId + '-send']: false }))
    }
  }

  const handleConfigureTrigger = async () => {
    try {
      const res = await sheetsApi.setupGmailTriggers()
      if (res && res.success) {
        showNotification("Hourly Gmail background synchronization active!")
      } else {
        showNotification(res?.error || "Failed to register trigger", "error")
      }
    } catch (e) {
      showNotification("Failed to configure trigger", "error")
    }
  }

  const handleConnectGmail = async (e) => {
    e.preventDefault()
    if (!connectEmail.trim()) return
    
    setIsConnecting(true)
    try {
      const res = await sheetsApi.generateAuthUrl(connectEmail.trim())
      if (res && res.success && res.authUrl) {
        setConnectionStep('authorizing')
        
        // Open Google OAuth consent screen in a popup
        const width = 500
        const height = 650
        const left = window.screen.width / 2 - width / 2
        const top = window.screen.height / 2 - height / 2
        
        const popup = window.open(
          res.authUrl,
          'google-auth-popup',
          `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
        )
        
        authPopupRef.current = popup

        // Start polling connected accounts status
        pollIntervalRef.current = setInterval(async () => {
          try {
            const pollRes = await sheetsApi.getConnectedAccounts()
            if (pollRes && pollRes.success) {
              const matched = (pollRes.accounts || []).find(
                a => a.email.toLowerCase() === connectEmail.trim().toLowerCase()
              )
              if (matched && matched.status === 'Connected') {
                // Connection succeeded! Clean up
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
                
                if (authPopupRef.current) {
                  authPopupRef.current.close()
                }
                
                showNotification(`Inbox connected successfully: ${connectEmail}`)
                setConnectedAccounts(pollRes.accounts)
                setIsConnectModalOpen(false)
                setConnectEmail('')
                setIsConnecting(false)
                setConnectionStep('input')
                fetchFeed() // Reload feed to include new account threads
              }
            }
          } catch (err) {
            console.error("Polling error:", err)
          }
        }, 3000)
      } else {
        showNotification(res?.error || "Failed to initiate OAuth flow", "error")
        setIsConnecting(false)
      }
    } catch (err) {
      console.error(err)
      showNotification("Network error initiating connection", "error")
      setIsConnecting(false)
    }
  }

  const handleCancelConnection = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (authPopupRef.current) {
      authPopupRef.current.close()
    }
    setIsConnecting(false)
    setConnectionStep('input')
  }

  const handleDeleteAccount = async (email) => {
    if (!confirm(`Are you sure you want to disconnect ${email}? This will stop automatic log fetching for this inbox.`)) return
    setDisconnectingEmail(email)
    try {
      const res = await sheetsApi.deleteConnectedAccount(email)
      if (res && res.success) {
        showNotification(`Disconnected inbox: ${email}`)
        setConnectedAccounts(prev => prev.filter(a => a.email !== email))
        fetchFeed()
      } else {
        showNotification(res?.error || "Failed to disconnect account", "error")
      }
    } catch (err) {
      showNotification("Network error disconnecting account", "error")
    } finally {
      setDisconnectingEmail(null)
    }
  }

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri)
    showNotification("Redirect URI copied to clipboard!")
  }

  // Senders management
  const handleAddSender = async (e) => {
    e.preventDefault()
    if (!newSenderName.trim()) return
    setSavingSenders(true)
    const newSender = {
      id: 'send-' + Math.random().toString(36).substr(2, 6),
      name: newSenderName.trim()
    }
    const updated = [...senders, newSender]
    const res = await saveSenders(updated)
    if (res.success) {
      setNewSenderName('')
      showNotification("Sender added successfully")
    } else {
      showNotification(res.error || "Failed to add sender", "error")
    }
    setSavingSenders(false)
  }

  const handleStartEditSender = (sender) => {
    setEditingSenderId(sender.id)
    setEditingSenderName(sender.name)
  }

  const handleSaveSenderEdit = async (id) => {
    if (!editingSenderName.trim()) return
    setSavingSenders(true)
    const updated = senders.map(s => s.id === id ? { ...s, name: editingSenderName.trim() } : s)
    const res = await saveSenders(updated)
    if (res.success) {
      setEditingSenderId(null)
      showNotification("Sender updated successfully")
    } else {
      showNotification(res.error || "Failed to update sender", "error")
    }
    setSavingSenders(false)
  }

  const handleDeleteSender = async (id) => {
    if (!confirm("Are you sure you want to delete this sender profile?")) return
    setSavingSenders(true)
    const updated = senders.filter(s => s.id !== id)
    const res = await saveSenders(updated)
    if (res.success) {
      showNotification("Sender removed successfully")
    } else {
      showNotification(res.error || "Failed to delete sender", "error")
    }
    setSavingSenders(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Integrations</h1>
          <p className="text-gray-400 text-sm mt-1">
            Connect outreach email boxes directly, manage dynamic campaign senders, and monitor aggregated replies.
          </p>
        </div>
        
        {/* Universal Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchFeed}
            disabled={loadingFeed || syncingAll}
            className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 bg-gray-900 rounded-lg transition duration-200 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loadingFeed ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-white rounded-full animate-spin inline-block" />
            ) : "🔄"} 
            Refresh Feed
          </button>
          
          <button
            onClick={handleSyncOutreach}
            disabled={syncingAll || loadingFeed}
            className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition duration-200 disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-orange-950/20"
          >
            {syncingAll ? (
              <span className="w-3.5 h-3.5 border-2 border-orange-300 border-t-white rounded-full animate-spin inline-block" />
            ) : "⚡"} 
            Sync Outreach & Inbox
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm shadow-xl transition-all duration-300 ${
          notification.type === 'error' 
            ? 'bg-red-500/10 text-red-400 border-red-500/25' 
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
        }`}>
          <span>{notification.type === 'error' ? '❌' : '✅'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Gmail Ingest Feed */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Aggregated Gmail Ingest Feed</h2>
                <p className="text-gray-400 text-xs mt-0.5">Unprocessed campaign replies matching your query across all connected inboxes</p>
              </div>
              <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium font-mono">
                {feed.length} thread{feed.length !== 1 ? 's' : ''} pending
              </span>
            </div>

            {loadingFeed ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-3 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Scanning connected mailboxes...</p>
              </div>
            ) : feed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-800 rounded-xl">
                <span className="text-3xl mb-3">📥</span>
                <h3 className="text-gray-300 font-medium text-sm">All Clean!</h3>
                <p className="text-gray-500 text-xs max-w-sm mt-1">
                  No new unprocessed emails detected. Make sure threads are tagged or received under your label/search query in the connected inboxes.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {feed.map((thread) => (
                  <div key={thread.threadId} className="bg-gray-950/65 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition duration-150 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-white text-xs font-semibold truncate max-w-[200px]" title={thread.sender}>
                          👤 {thread.sender}
                        </span>
                        <span className="text-gray-500 text-[10px]">→</span>
                        <span className="text-orange-400/90 text-[10px] font-mono truncate max-w-[180px]" title={thread.recipient}>
                          ✉️ {thread.recipient}
                        </span>
                      </div>
                      <h4 className="text-gray-200 text-xs font-semibold truncate mb-1.5">{thread.subject}</h4>
                      <p className="text-gray-400 text-xs line-clamp-2 italic bg-gray-900/30 p-2 rounded-lg border border-gray-900 font-sans leading-relaxed">
                        "{thread.snippet}"
                      </p>
                      <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
                        <span>🗓️</span>
                        <span>{new Date(thread.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    
                    <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 self-stretch sm:self-auto shrink-0 border-t sm:border-t-0 border-gray-800 pt-3 sm:pt-0">
                      <button
                        onClick={() => handleSendCalcLink(thread.threadId)}
                        disabled={actionLoading[thread.threadId + '-send'] || actionLoading[thread.threadId]}
                        className="w-full sm:w-auto bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actionLoading[thread.threadId + '-send'] ? (
                          <span className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-white rounded-full animate-spin inline-block" />
                        ) : "✉️"}
                        Send Calc Link
                      </button>

                      <button
                        onClick={() => handleLinkLead(thread.threadId)}
                        disabled={actionLoading[thread.threadId + '-send'] || actionLoading[thread.threadId]}
                        className="w-full sm:w-auto bg-orange-600/15 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/20 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actionLoading[thread.threadId] ? (
                          <span className="w-3.5 h-3.5 border-2 border-orange-300 border-t-white rounded-full animate-spin inline-block" />
                        ) : "⚡"}
                        Link / Import
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Configurations, Accounts & Senders Manager */}
        <div className="flex flex-col gap-6">
          
          {/* Connected Email Accounts Section */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Connected Email Boxes</h2>
                <p className="text-gray-400 text-xs mt-0.5">Manage target outreach inboxes</p>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
              >
                + Connect
              </button>
            </div>

            {loadingAccounts ? (
              <div className="flex justify-center py-4">
                <span className="w-5 h-5 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                {connectedAccounts.map((account) => (
                  <div key={account.email} className="flex items-center justify-between gap-2 bg-gray-950/45 border border-gray-800/80 rounded-lg px-3 py-2 text-xs">
                    <div className="flex flex-col min-w-0">
                      <span className="text-gray-200 font-medium truncate">{account.email}</span>
                      <span className="text-[9px] text-gray-500 mt-0.5">
                        Connected: {new Date(account.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                        account.status.startsWith('Error')
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`} title={account.status}>
                        {account.status.startsWith('Error') ? 'Error' : 'Connected'}
                      </span>
                      <button
                        onClick={() => handleDeleteAccount(account.email)}
                        disabled={disconnectingEmail === account.email}
                        className="text-gray-500 hover:text-red-400 p-1 transition disabled:opacity-50"
                        title="Disconnect inbox"
                      >
                        {disconnectingEmail === account.email ? '...' : '🗑️'}
                      </button>
                    </div>
                  </div>
                ))}
                
                {connectedAccounts.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-gray-800 rounded-xl">
                    <p className="text-gray-500 text-xs">No email accounts integrated yet.</p>
                    <p className="text-[10px] text-gray-600 mt-1 max-w-[200px] mx-auto leading-normal">
                      Connecting accounts allows BDL to fetch replies directly from their APIs.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Developer Configuration Settings */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Google OAuth Developer App</h2>
              <p className="text-gray-400 text-xs mt-0.5">Configures the API client used to connect mailboxes</p>
            </div>

            {loadingOAuth ? (
              <div className="flex justify-center py-4">
                <span className="w-5 h-5 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSaveOAuth} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-medium">OAuth 2.0 Client ID</label>
                  <input
                    type="text"
                    value={oauthClientId}
                    onChange={(e) => setOauthClientId(e.target.value)}
                    placeholder="Enter Google Client ID"
                    className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-medium">OAuth 2.0 Client Secret</label>
                  <input
                    type="password"
                    value={oauthClientSecret}
                    onChange={(e) => setOauthClientSecret(e.target.value)}
                    placeholder={hasClientSecret ? "••••••••••••••••" : "Enter Google Client Secret"}
                    className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>

                <div className="bg-gray-950 border border-gray-800 rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold font-mono">Authorized Redirect URI</span>
                  <div className="flex items-center gap-2 mt-0.5 justify-between">
                    <span className="text-[10px] text-orange-400/90 font-mono truncate select-all">{redirectUri}</span>
                    <button
                      type="button"
                      onClick={copyRedirectUri}
                      className="text-[10px] bg-gray-900 hover:bg-gray-800 border border-gray-800 px-2 py-0.5 rounded text-gray-300 hover:text-white transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={savingOAuth || !oauthClientId.trim() || !oauthClientSecret.trim()}
                  className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {savingOAuth ? "Saving App Credentials..." : "Save Developer Settings"}
                </button>
              </form>
            )}
          </div>
          
          {/* Gmail Ingestion Settings */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Gmail Ingest Configuration</h2>
              <p className="text-gray-400 text-xs mt-0.5">Customize query criteria to fetch campaign replies</p>
            </div>

            {loadingSettings ? (
              <div className="flex justify-center py-4">
                <span className="w-5 h-5 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium">Gmail Search Query String</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. label:BDL-Leads"
                    className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-orange-500 transition duration-150"
                  />
                  <p className="text-[10px] text-gray-500 leading-normal">
                    Queries Gmail threads. Avoid spaces in labels (e.g. use <code>label:BDL-Leads</code>). Automatically excludes already linked threads containing <code>BDL-Processed</code> label.
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white py-2 rounded-lg text-xs font-semibold transition duration-150 disabled:opacity-50"
                >
                  {savingSettings ? "Saving..." : "Update Query Setting"}
                </button>
              </form>
            )}

            <div className="border-t border-gray-800 pt-4 mt-2 flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-gray-300">Autopilot Ingestion Schedule</h3>
              <p className="text-[10px] text-gray-500 leading-normal">
                Google Sheets triggers run the scanning and linking parser once every hour automatically. Click below to establish/refresh trigger.
              </p>
              <button
                onClick={handleConfigureTrigger}
                className="w-full bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20 py-2 rounded-lg text-xs font-semibold transition duration-150"
              >
                ⚙️ Setup Hourly Autopilot Sync
              </button>
            </div>
          </div>

          {/* Senders CRUD Manager */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Campaign Senders Manager</h2>
              <p className="text-gray-400 text-xs mt-0.5">Edit profiles used as outbound email accounts</p>
            </div>

            {/* List of senders */}
            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
              {senders.map((sender) => (
                <div key={sender.id} className="flex items-center justify-between gap-2 bg-gray-950/45 border border-gray-800/80 rounded-lg px-3 py-2 text-xs">
                  {editingSenderId === sender.id ? (
                    <input
                      type="text"
                      value={editingSenderName}
                      onChange={(e) => setEditingSenderName(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded text-xs focus:outline-none"
                    />
                  ) : (
                    <span className="text-gray-200 truncate">{sender.name}</span>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingSenderId === sender.id ? (
                      <>
                        <button
                          onClick={() => handleSaveSenderEdit(sender.id)}
                          disabled={savingSenders}
                          className="text-emerald-400 hover:text-emerald-300 font-bold p-1"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingSenderId(null)}
                          className="text-gray-400 hover:text-gray-200 font-bold p-1"
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEditSender(sender)}
                          className="text-gray-400 hover:text-orange-400 p-1 transition"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteSender(sender.id)}
                          disabled={savingSenders}
                          className="text-gray-500 hover:text-red-400 p-1 transition"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {senders.length === 0 && (
                <p className="text-gray-600 text-xs text-center py-4">No sender accounts configured.</p>
              )}
            </div>

            {/* Add Sender Form */}
            <form onSubmit={handleAddSender} className="flex gap-2 border-t border-gray-800 pt-3">
              <input
                type="text"
                value={newSenderName}
                onChange={(e) => setNewSenderName(e.target.value)}
                placeholder="New Sender Name..."
                disabled={savingSenders}
                className="flex-1 bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-1.5 placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
              />
              <button
                type="submit"
                disabled={savingSenders || !newSenderName.trim()}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs px-3 rounded-lg font-semibold transition"
              >
                + Add
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Connect Gmail Modal Pop-up */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-semibold text-white">Connect Gmail Inbox</h3>
                <p className="text-gray-400 text-xs mt-0.5">Integrate a secondary campaign email address</p>
              </div>
              <button
                onClick={() => {
                  handleCancelConnection()
                  setIsConnectModalOpen(false)
                }}
                className="text-gray-500 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {connectionStep === 'input' ? (
              <form onSubmit={handleConnectGmail} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">Target Gmail Address</label>
                  <input
                    type="email"
                    value={connectEmail}
                    onChange={(e) => setConnectEmail(e.target.value)}
                    placeholder="e.g. outreach-sender@gmail.com"
                    required
                    className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                  />
                  <p className="text-[10px] text-gray-500 leading-normal mt-1">
                    Note: Ensure your global Client ID is registered in the developer console, and that this target email is added as a Test User if your developer app is in Testing mode.
                  </p>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="px-4 py-2 border border-gray-800 hover:border-gray-700 hover:text-white rounded-lg text-xs font-semibold text-gray-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting || !connectEmail.trim()}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isConnecting && <span className="w-3 h-3 border border-orange-300 border-t-white rounded-full animate-spin" />}
                    Authorise Box
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-orange-600/10 border-t-orange-500 rounded-full animate-spin" />
                  <span className="absolute text-xl">🔑</span>
                </div>
                <div>
                  <h4 className="text-gray-200 font-semibold text-sm">Authorisation Pending</h4>
                  <p className="text-gray-400 text-xs mt-1 max-w-xs leading-normal">
                    Please complete the sign-in and authorization scopes in the newly opened Google account tab.
                  </p>
                  <p className="text-orange-400 font-mono text-[10px] bg-orange-950/20 border border-orange-500/10 rounded px-2 py-1 mt-3.5 inline-block">
                    Listening for {connectEmail}...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelConnection}
                  className="mt-2 text-xs font-semibold text-gray-500 hover:text-red-400 transition"
                >
                  Cancel & Stop Waiting
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
