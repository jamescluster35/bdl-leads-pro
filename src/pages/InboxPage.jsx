import { useState, useEffect } from 'react'
import { sheetsApi } from '../lib/sheetsApi'

export default function InboxPage() {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)

  const fetchFeed = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await sheetsApi.getGmailInboxFeed()
      if (res && res.success && res.feed) {
        setFeed(res.feed)
      } else if (res && res.error) {
        throw new Error(res.error)
      } else {
        throw new Error('Could not fetch inbox feed.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeed()
  }, [])

  const handleProcessThread = async (threadId) => {
    setProcessingId(threadId)
    try {
      const res = await sheetsApi.processGmailThread(threadId)
      if (res && res.success) {
        alert(`Lead linked successfully! Email matched: ${res.parsedEmail}`)
        // Remove from current local feed
        setFeed(prev => prev.filter(t => t.threadId !== threadId))
      } else {
        alert(res?.error || 'Failed to process lead.')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while linking lead.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Unified Inbox</h1>
          <p className="text-gray-400 text-sm mt-0.5">Replies aggregated from all connected outreach accounts</p>
        </div>
        <button
          onClick={fetchFeed}
          disabled={loading}
          className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
              Refreshing...
            </>
          ) : (
            <>🔄 Refresh Feed</>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠️</span>
          <div>
            <p className="text-red-300 text-sm font-semibold">Failed to fetch replies</p>
            <p className="text-red-400/70 text-xs">{error}</p>
          </div>
        </div>
      )}

      {loading && feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="w-8 h-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">Scanning connected accounts for replies...</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <span className="text-4xl block mb-3">📥</span>
          <h2 className="text-white text-base font-semibold">No unread replies</h2>
          <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">All campaign email replies have been linked and processed. Your outreach pipeline is clean!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feed.map((thread) => {
            const receivedInbox = thread.threadId.includes('::') ? thread.threadId.split('::')[1] : 'Script Owner'
            const formattedDate = new Date(thread.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })

            return (
              <div
                key={thread.threadId}
                className="bg-gray-900 border border-gray-850 hover:border-gray-700 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-all duration-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <span className="text-orange-400 font-semibold text-xs bg-orange-600/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                      {receivedInbox}
                    </span>
                    <span className="text-gray-500 text-xs">{formattedDate}</span>
                  </div>
                  <h3 className="text-white font-semibold text-sm truncate">{thread.sender}</h3>
                  <p className="text-gray-400 text-xs font-medium truncate mt-0.5">Subject: {thread.subject}</p>
                  <p className="text-gray-500 text-xs line-clamp-2 mt-2 leading-relaxed bg-gray-950/40 p-2.5 rounded-lg border border-gray-850">
                    "{thread.snippet}"
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => handleProcessThread(thread.threadId)}
                    disabled={processingId === thread.threadId}
                    className="w-full md:w-auto bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-950/20"
                  >
                    {processingId === thread.threadId ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-orange-350 border-t-white rounded-full animate-spin" />
                        Linking...
                      </>
                    ) : (
                      <>✓ Link & Process Lead</>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
