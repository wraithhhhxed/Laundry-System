import React, { useState, useRef, useEffect, useContext } from 'react'
import { AppContext } from '../context/AppContext'

const NotificationBell = () => {
  const { notifications, unreadCount, removeNotification, markNotificationAsRead, clearAllNotifications } = useContext(AppContext)
  
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = (notifId) => {
    markNotificationAsRead(notifId)
  }

  return (
    <div ref={dropdownRef} className="relative flex items-center">
      {/* BELL ICON WITH BADGE */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-blue-50 transition-colors duration-200"
        aria-label="Notifications"
      >
        {/* BELL ICON */}
        <svg
          className="w-5 h-5 text-neutral-600 hover:text-blue-600 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* BADGE */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[16px] h-[16px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN MODAL */}
      {showDropdown && (
        <div
          className="absolute right-0 mt-2 w-80 bg-white border border-blue-100 shadow-2xl z-50 overflow-hidden"
          style={{
            top: '100%',
            marginTop: '8px',
          }}
        >
          {/* HEADER */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-xs opacity-80 hover:opacity-100 transition-opacity"
              >
                Clear All
              </button>
            )}
          </div>

          {/* NOTIFICATIONS LIST */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-500">
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs text-neutral-400 mt-1">
                  You will be notified when your laundry status updates
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.id)}
                  className={`px-4 py-3 border-b border-blue-50/60 cursor-pointer transition-all duration-200 ${
                    notif.read
                      ? 'bg-white hover:bg-blue-50'
                      : 'bg-blue-50/50 hover:bg-blue-100/50'
                  } last:border-0`}
                >
                  <div className="flex items-start gap-3">
                    {/* ICON - no emojis, using simple circle indicator */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600 uppercase">
                        {notif.title?.charAt(0) || 'N'}
                      </span>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-sans text-sm font-bold ${
                        notif.read
                          ? 'text-neutral-700'
                          : 'text-blue-700'
                      }`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-neutral-400 mt-2">
                        {formatTime(notif.timestamp)}
                      </p>
                    </div>

                    {/* UNREAD INDICATOR & CLOSE */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notif.read && (
                        <span className="w-2 h-2 bg-blue-600" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeNotification(notif.id)
                        }}
                        className="text-neutral-400 hover:text-red-500 transition-colors"
                        aria-label="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── HELPER: Format timestamp ──────────────────────────────────────
const formatTime = (timestamp) => {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default NotificationBell