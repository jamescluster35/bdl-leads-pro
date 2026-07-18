import { useState, useEffect } from 'react'
import { sheetsApi } from '../lib/sheetsApi'

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
  'CPA / Accountant',
  'Real Estate Agent',
  'Junk Removal',
  'Healthcare Staffing',
  'Education'
]

export default function ProspectFinderPage() {
  const [niche, setNiche] = useState('Dentist')
  const [city, setCity] = useState('')
  const [preset, setPreset] = useState('Standard')
  const [statusMsg, setStatusMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Local storage tracker for the daily 10 prospects
  const [dailyChecks, setDailyChecks] = useState(() => {
    const saved = localStorage.getItem('bdl_prospects_daily_checks')
    const savedDate = localStorage.getItem('bdl_prospects_daily_date')
    const todayStr = new Date().toDateString()

    // If it's a new day, reset checklist automatically
    if (savedDate !== todayStr) {
      localStorage.setItem('bdl_prospects_daily_date', todayStr)
      const fresh = Array(10).fill(false)
      localStorage.setItem('bdl_prospects_daily_checks', JSON.stringify(fresh))
      return fresh
    }

    return saved ? JSON.parse(saved) : Array(10).fill(false)
  })

  useEffect(() => {
    localStorage.setItem('bdl_prospects_daily_checks', JSON.stringify(dailyChecks))
  }, [dailyChecks])

  const toggleCheck = (index) => {
    setDailyChecks(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const resetChecks = () => {
    const fresh = Array(10).fill(false)
    setDailyChecks(fresh)
  }

  const handleOpenMaps = () => {
    if (!city.trim()) {
      setStatusMsg('⚠️ Please enter a city or ZIP code first.')
      return
    }
    setStatusMsg('')
    let query = `${niche} in ${city.trim()}`
    if (preset === 'NoWebsite') {
      query = `${niche} in ${city.trim()} "website" missing`
    } else if (preset === 'LowRating') {
      query = `unclaimed ${niche} in ${city.trim()} OR "low reviews" ${niche} in ${city.trim()}`
    } else if (preset === 'NoBooking') {
      query = `${niche} in ${city.trim()} "booking" missing OR "appointment" ${niche} in ${city.trim()}`
    }
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`
    window.open(url, '_blank')
  }

  const handleOpenEmails = () => {
    if (!city.trim()) {
      setStatusMsg('⚠️ Please enter a city or ZIP code first.')
      return
    }
    setStatusMsg('')
    let query = `"${niche}" "${city.trim()}" email contact`
    if (preset === 'NoWebsite') {
      query = `"${niche}" "${city.trim()}" "website" missing email contact`
    } else if (preset === 'LowRating') {
      query = `"${niche}" "${city.trim()}" reviews rating email contact`
    } else if (preset === 'NoBooking') {
      query = `"${niche}" "${city.trim()}" booking appointment email contact`
    }
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    window.open(url, '_blank')
  }

  const runManualReminders = async () => {
    setLoading(true)
    setStatusMsg('⏳ Sending follow-up reminders...')
    try {
      const res = await sheetsApi.sendFollowUpReminders()
      if (res.success) {
        setStatusMsg(`✅ Reminders run complete: ${res.message || 'Notification sent!'}`)
      } else {
        setStatusMsg(`❌ Error: ${res.error || 'Failed to trigger reminders.'}`)
      }
    } catch (err) {
      setStatusMsg(`❌ Request failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const runSetupTrigger = async () => {
    setLoading(true)
    setStatusMsg('⏳ Configuring daily 9 AM reminder trigger...')
    try {
      const res = await sheetsApi.setupRemindersTrigger()
      if (res.success) {
        setStatusMsg(`✅ Daily trigger registered: ${res.message || 'Scheduled at 9 AM!'}`)
      } else {
        setStatusMsg(`❌ Error: ${res.error || 'Failed to configure trigger.'}`)
      }
    } catch (err) {
      setStatusMsg(`❌ Request failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const completedCount = dailyChecks.filter(Boolean).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Prospect Finder</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Find and qualify local businesses for your revenue leakage calculator niches.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Finder Form */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <h2 className="text-white font-semibold text-base mb-2">Configure Search</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Target Niche</label>
              <select
                value={niche}
                onChange={e => setNiche(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500"
              >
                {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Target City or ZIP Code</label>
              <input
                type="text"
                placeholder="e.g. Miami, Houston, 90210, 33139"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2.5 placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Search Preset (Target Operational Gaps)</label>
              <select
                value={preset}
                onChange={e => setPreset(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500"
              >
                <option value="Standard">Standard Search (All listings)</option>
                <option value="NoWebsite">Website Gap (No website listed)</option>
                <option value="LowRating">Reputation Gap (Poor reviews or ratings)</option>
                <option value="NoBooking">Booking Gap (No online scheduling)</option>
              </select>
            </div>

            {statusMsg && (
              <div className={`text-xs px-3 py-2 rounded-lg border ${
                statusMsg.includes('✅') 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : statusMsg.includes('❌') || statusMsg.includes('⚠️')
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
              }`}>
                {statusMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={handleOpenMaps}
                className="bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                🗺️ Find on Maps
              </button>
              <button
                onClick={handleOpenEmails}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium py-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                📧 Search Emails
              </button>
            </div>
          </div>

          {/* Guide Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-white font-semibold text-base mb-3">Prospecting Workflow Guide</h2>
            <div className="flex flex-col gap-3 text-sm text-gray-300">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center text-xs font-semibold">1</span>
                <p>Select a <strong>Niche</strong> and enter a <strong>City or ZIP Code</strong>, then launch the maps search in a new tab.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center text-xs font-semibold">2</span>
                <p>In Google Maps, check business listings. Look for businesses with a <strong>poor rating (&lt; 4.2 stars)</strong> or <strong>low review count</strong>, which indicate potential revenue leakage.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center text-xs font-semibold">3</span>
                <p>Click **Search Emails** to query Google for contact information to directly outreach.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center text-xs font-semibold">4</span>
                <p>Add the prospect details directly as a **New Lead** in the CRM dashboard to begin tracking outreach campaigns.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Daily Tracker & Trigger Setup */}
        <div className="flex flex-col gap-6">
          {/* Daily 10 Tracker */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-white font-semibold text-base">Daily Target Tracker</h2>
              <button
                onClick={resetChecks}
                className="text-xs text-gray-500 hover:text-orange-400 transition-colors"
              >
                Reset
              </button>
            </div>
            
            <p className="text-gray-400 text-xs mb-4">
              Aim to find and log <strong>10 high-quality local prospects</strong> each day.
            </p>

            <div className="flex items-center justify-between mb-4 bg-gray-800/30 rounded-xl px-4 py-2 border border-gray-800">
              <span className="text-xs text-gray-400 font-medium">Today's Progress</span>
              <span className="text-sm font-bold text-orange-400">{completedCount} / 10</span>
            </div>

            <div className="flex flex-col gap-2">
              {dailyChecks.map((checked, i) => (
                <button
                  key={i}
                  onClick={() => toggleCheck(i)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                    checked
                      ? 'bg-orange-600/10 border-orange-500/20 text-orange-400'
                      : 'bg-gray-800/50 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>Prospect #{i + 1}</span>
                  <span className="text-base">{checked ? '✅' : '⬜'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Management */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-3">
            <h2 className="text-white font-semibold text-base">Daily Reminders Settings</h2>
            <p className="text-gray-400 text-xs leading-relaxed">
              Ensure follow-up reminders are configured to send daily alerts (via email and Chat webhook) at 9:00 AM.
            </p>
            <button
              onClick={runSetupTrigger}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors text-xs border border-gray-700"
            >
              ⚙️ Setup Daily 9 AM Trigger
            </button>
            <button
              onClick={runManualReminders}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors text-xs border border-gray-700"
            >
              ⏰ Test Trigger (Run Now)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
