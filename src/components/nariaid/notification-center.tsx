'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Droplets, CalendarDays, Trophy, AlertCircle, Clock, X, CheckCheck } from 'lucide-react'
import { format, differenceInDays, addDays, parseISO, isValid } from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string
  type: 'health-log' | 'hydration' | 'period' | 'streak' | 'stress' | 'checkin'
  title: string
  message: string
  timestamp: Date
  read: boolean
  icon: React.ElementType
  color: string
}

// NotificationCenter fetches its own data since it lives in the header
// which doesn't have access to dashboard data

// ---------------------------------------------------------------------------
// Helper: generate notifications from data
// ---------------------------------------------------------------------------

interface HealthLogData {
  id: string
  date: string
  mood: number
  energy: number
  sleep: number
  stress: number
  waterIntake: number
}

interface ProfileData {
  cycleLength: number
  lastPeriodStart: string
}

function generateNotifications(
  healthLogs: HealthLogData[],
  profile: ProfileData | null
): Notification[] {
  const notifications: Notification[] = []
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')

  // 1. Haven't logged health today
  const todayLog = healthLogs.find((l) => l.date === today)
  if (!todayLog) {
    notifications.push({
      id: 'no-log-today',
      type: 'health-log',
      title: 'Daily Check-in',
      message: 'You haven\'t logged your health today. Take a moment to check in with yourself.',
      timestamp: now,
      read: false,
      icon: Clock,
      color: '#E8788A',
    })
  }

  // 2. Hydration reminder
  if (todayLog && todayLog.waterIntake < 4) {
    notifications.push({
      id: 'low-hydration',
      type: 'hydration',
      title: 'Stay Hydrated',
      message: `You've had ${todayLog.waterIntake} glasses of water today. Try to drink at least 8 glasses.`,
      timestamp: now,
      read: false,
      icon: Droplets,
      color: '#60A5FA',
    })
  }

  // 3. Period countdown
  if (profile?.lastPeriodStart && profile.cycleLength > 0) {
    const lastStart = parseISO(profile.lastPeriodStart)
    if (isValid(lastStart)) {
      const nextPeriod = addDays(lastStart, profile.cycleLength)
      const daysUntil = differenceInDays(nextPeriod, now)
      if (daysUntil > 0 && daysUntil <= 7) {
        notifications.push({
          id: 'period-soon',
          type: 'period',
          title: 'Period Approaching',
          message: `Your period is expected in ${daysUntil} day${daysUntil === 1 ? '' : 's'}. Make sure you\'re prepared.`,
          timestamp: now,
          read: false,
          icon: CalendarDays,
          color: '#C084FC',
        })
      }
    }
  }

  // 4. Streak recognition
  if (healthLogs.length >= 3) {
    const recentDates = healthLogs.slice(0, 7).map((l) => l.date).sort()
    let streak = 1
    for (let i = 1; i < recentDates.length; i++) {
      const diff = differenceInDays(parseISO(recentDates[i]), parseISO(recentDates[i - 1]))
      if (diff === 1) {
        streak++
      } else {
        break
      }
    }
    if (streak >= 3) {
      notifications.push({
        id: 'streak',
        type: 'streak',
        title: 'Consistency Streak',
        message: `Great job! You've logged your health for ${streak} consecutive days. Keep it up!`,
        timestamp: now,
        read: false,
        icon: Trophy,
        color: '#34D399',
      })
    }
  }

  // 5. High stress alert
  if (healthLogs.length >= 3) {
    const recentStress = healthLogs.slice(0, 3)
    const avgStress = recentStress.reduce((sum, l) => sum + l.stress, 0) / recentStress.length
    if (avgStress >= 7) {
      notifications.push({
        id: 'high-stress',
        type: 'stress',
        title: 'Stress Alert',
        message: 'Your stress levels have been elevated recently. Consider a breathing exercise or a short walk.',
        timestamp: now,
        read: false,
        icon: AlertCircle,
        color: '#F59E0B',
      })
    }
  }

  return notifications
}

// ---------------------------------------------------------------------------
// Main NotificationCenter Component
// ---------------------------------------------------------------------------

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Fetch data and generate notifications
  useEffect(() => {
    const loadData = async () => {
      try {
        const [logsRes, profileRes] = await Promise.all([
          fetch('/api/health-logs'),
          fetch('/api/profile'),
        ])

        let healthLogs: HealthLogData[] = []
        let profile: ProfileData | null = null

        if (logsRes.ok) {
          healthLogs = await logsRes.json()
        }
        if (profileRes.ok) {
          profile = await profileRes.json()
        }

        const generated = generateNotifications(healthLogs, profile)
        setNotifications(generated)
      } catch (err) {
        console.error('Failed to load notification data:', err)
      }
    }
    loadData()
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  // Dismiss single notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // Mark all as read
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-lg hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] transition-colors btn-press"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-[#9B6B7B] dark:text-[#A07888]" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#E8788A] rounded-full flex items-center justify-center"
          >
            <span className="text-[8px] font-bold text-white">{unreadCount}</span>
          </motion.div>
        )}
        {unreadCount > 0 && (
          <motion.div
            className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#E8788A]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 top-8 w-72 bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA] dark:border-[#4A2535] shadow-xl shadow-[#E8788A]/10 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FFF0F3] to-[#F5F3FF] dark:from-[#3A2030] dark:to-[#2A1A30] border-b border-[#F9D0DA]/40 dark:border-[#4A2535]/40">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-[#E8788A]" />
                <span className="text-xs font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Notifications</span>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="p-1 rounded-md hover:bg-[#F9D0DA]/30 dark:hover:bg-[#4A2535]/30 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3 text-[#9B6B7B] dark:text-[#A07888]" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md hover:bg-[#F9D0DA]/30 dark:hover:bg-[#4A2535]/30 transition-colors"
                >
                  <X className="w-3 h-3 text-[#9B6B7B] dark:text-[#A07888]" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="w-6 h-6 text-[#F9D0DA] dark:text-[#4A2535] mx-auto mb-2" />
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">No new notifications</p>
                </div>
              ) : (
                <div className="py-1">
                  <AnimatePresence>
                    {notifications.map((notification) => {
                      const Icon = notification.icon
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`px-4 py-3 flex items-start gap-3 hover:bg-[#FFF0F3]/60 dark:hover:bg-[#3A2030]/40 transition-colors ${
                            !notification.read ? 'bg-[#FFF0F3]/30 dark:bg-[#3A2030]/20' : ''
                          }`}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: `${notification.color}15` }}
                          >
                            <Icon className="w-3.5 h-3.5" style={{ color: notification.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
                                {notification.title}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  dismissNotification(notification.id)
                                }}
                                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#F9D0DA]/30 dark:hover:bg-[#4A2535]/30 transition-opacity"
                              >
                                <X className="w-2.5 h-2.5 text-[#9B6B7B] dark:text-[#A07888]" />
                              </button>
                            </div>
                            <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#E8788A] shrink-0 mt-1.5" />
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
