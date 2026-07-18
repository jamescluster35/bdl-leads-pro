import { useState } from 'react'
import { sheetsApi } from '../lib/sheetsApi'

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    const trimmedPassword = password.trim()
    if (!trimmedPassword) {
      setError('Enter your password')
      return
    }
    setLoading(true)
    setError('')

    try {
      // Temporarily store the entered password in localStorage so the sheetsApi can use it to authenticate
      localStorage.setItem('bdl_password', trimmedPassword)

      // Test the password against the backend by trying to fetch templates
      const res = await sheetsApi.getTemplates()

      if (res && (res.error || res.success === false)) {
        // Clear stored password on failure
        localStorage.removeItem('bdl_password')
        setError('Incorrect password. Try again.')
        setLoading(false)
      } else {
        // Success! Set auth credentials and transition to dashboard
        localStorage.setItem('bdl_auth', 'true')
        onLogin()
      }
    } catch (err) {
      localStorage.removeItem('bdl_password')
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-2xl mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h1 className="text-white font-bold text-2xl">Blue Data Labs</h1>
          <p className="text-gray-500 text-sm mt-1">Leads Pro — Private Access</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <p className="text-gray-400 text-sm mb-5 text-center">
            Enter your password to access the dashboard
          </p>

          <div className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Password"
              className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-orange-500 w-full"
              autoFocus
            />

            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-medium py-3 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Checking...' : 'Sign In →'}
            </button>
          </div>
        </div>

        <p className="text-gray-700 text-xs text-center mt-4">
          Blue Data Labs © 2026
        </p>
      </div>
    </div>
  )
}