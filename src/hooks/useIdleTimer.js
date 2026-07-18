import { useEffect, useRef, useState, useCallback } from 'react'

const IDLE_TIMEOUT  = 30 * 60 * 1000  // 30 minutes
const WARN_BEFORE   = 2  * 60 * 1000  // warn 2 mins before logout

export function useIdleTimer(onLogout) {
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(120)
  const idleTimer   = useRef(null)
  const warnTimer   = useRef(null)
  const countdownRef = useRef(null)

  const clearAllTimers = () => {
    clearTimeout(idleTimer.current)
    clearTimeout(warnTimer.current)
    clearInterval(countdownRef.current)
  }

  const resetTimer = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)
    setSecondsLeft(120)

    // Start warning timer
    warnTimer.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(120)
      // Countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(countdownRef.current)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }, IDLE_TIMEOUT - WARN_BEFORE)

    // Logout timer
    idleTimer.current = setTimeout(() => {
      clearAllTimers()
      setShowWarning(false)
      onLogout()
    }, IDLE_TIMEOUT)
  }, [onLogout])

  const stayLoggedIn = () => {
    resetTimer()
  }

  useEffect(() => {
    const EVENTS = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click']
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
      clearAllTimers()
    }
  }, [resetTimer])

  return { showWarning, secondsLeft, stayLoggedIn }
}