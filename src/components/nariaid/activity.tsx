'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, isValid, isToday, isYesterday, subDays, startOfWeek } from 'date-fns'
import {
  Clock,
  Heart,
  Bell,
  CalendarDays,
  Sparkles,
  Activity,
  Trash2,
  Filter,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Plus,
  Eye,
  Settings,
  ChevronDown,
  Hash,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityLog {
  id: string
  action: string
  category: string
  details: string
  createdAt: string
}

type CategoryFilter = 'all' | 'health-log' | 'reminders' | 'calendar' | 'wellness' | 'general'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: { value: CategoryFilter; label: string; icon: typeof Heart; color: string }[] = [
  { value: 'health-log', label: 'Health Log', icon: Heart, color: '#E8788A' },
  { value: 'reminders', label: 'Reminders', icon: Bell, color: '#F9A8D4' },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays, color: '#C084FC' },
  { value: 'wellness', label: 'Wellness', icon: Sparkles, color: '#34D399' },
  { value: 'general', label: 'General', icon: Activity, color: '#60A5FA' },
]

const ACTION_ICONS: Record<string, typeof Heart> = {
  created: Plus,
  updated: Edit3,
  viewed: Eye,
  deleted: Trash2,
  completed: CheckCircle2,
  configured: Settings,
}

const ACTION_COLORS: Record<string, string> = {
  created: '#34D399',
  updated: '#60A5FA',
  viewed: '#C084FC',
  deleted: '#E8788A',
  completed: '#F9A8D4',
  configured: '#FBBF24',
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const pageVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
}

const timelineItemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
}

// ---------------------------------------------------------------------------
// Gradient border wrapper
// ---------------------------------------------------------------------------

function GradientBorderCard({
  children,
  className = '',
  gradient = 'from-[#E8788A] via-[#F9A8D4] to-[#C084FC]',
  animateIndex = 0,
}: {
  children: React.ReactNode
  className?: string
  gradient?: string
  animateIndex?: number
}) {
  return (
    <motion.div
      custom={animateIndex}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative rounded-2xl p-[1.5px] bg-gradient-to-br ${gradient} ${className}`}
    >
      <div className="bg-white dark:bg-[#2A1520] rounded-[14px] h-full">
        {children}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return dateStr
    if (isToday(parsed)) return 'Today'
    if (isYesterday(parsed)) return 'Yesterday'
    return format(parsed, 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function formatTime(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    return format(parsed, 'h:mm a')
  } catch {
    return ''
  }
}

function getCategoryInfo(category: string) {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES[4]
}

// ---------------------------------------------------------------------------
// Main Activity Component
// ---------------------------------------------------------------------------

export default function ActivityPage() {
  // ---- Data state ----
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)

  // ---- Filter state ----
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  // ---- Fetch activities ----
  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/activity-logs')
      if (res.ok) {
        const data = await res.json()
        setActivities(data)
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // ---- Clear history ----
  const handleClearHistory = useCallback(async () => {
    setClearing(true)
    try {
      const res = await fetch('/api/activity-logs', { method: 'DELETE' })
      if (res.ok) {
        setActivities([])
      }
    } catch (err) {
      console.error('Failed to clear activity logs:', err)
    } finally {
      setClearing(false)
    }
  }, [])

  // ---- Derived data ----
  const filteredActivities = useMemo(() => {
    if (activeFilter === 'all') return activities
    return activities.filter(a => a.category === activeFilter)
  }, [activities, activeFilter])

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {}
    filteredActivities.forEach(activity => {
      const dateLabel = formatRelativeDate(activity.createdAt)
      if (!groups[dateLabel]) groups[dateLabel] = []
      groups[dateLabel].push(activity)
    })
    return groups
  }, [filteredActivities])

  // Stats
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const todayCount = activities.filter(a => {
      try { return format(parseISO(a.createdAt), 'yyyy-MM-dd') === today } catch { return false }
    }).length

    const weekCount = activities.filter(a => {
      try { return format(parseISO(a.createdAt), 'yyyy-MM-dd') >= weekStart } catch { return false }
    }).length

    // Most active category
    const catCounts: Record<string, number> = {}
    activities.forEach(a => {
      catCounts[a.category] = (catCounts[a.category] || 0) + 1
    })
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]

    return {
      todayCount,
      weekCount,
      total: activities.length,
      topCategory: topCategory ? { name: topCategory[0], count: topCategory[1] } : null,
    }
  }, [activities])

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0D12] px-4 py-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/60 dark:bg-[#2A1520]/60 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-[#F9D0DA]/40 dark:bg-[#4A2535]/40 rounded w-1/3 mb-4" />
              <div className="h-3 bg-[#F9D0DA]/30 dark:bg-[#4A2535]/30 rounded w-2/3 mb-2" />
              <div className="h-3 bg-[#F9D0DA]/20 dark:bg-[#4A2535]/20 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---- Render ----
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0D12] relative overflow-hidden"
    >
      {/* Decorative background blobs */}
      <div
        className="absolute top-[-60px] right-[-70px] w-[260px] h-[260px] rounded-full opacity-25 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #F9A8D4 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blob 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[400px] left-[-80px] w-[240px] h-[240px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 10s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute bottom-[150px] right-[-50px] w-[200px] h-[200px] rounded-full opacity-15 dark:opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #E8788A 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 12s ease-in-out infinite 4s',
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-4 py-6 pb-24 max-w-2xl mx-auto space-y-5">

        {/* ============================================================ */}
        {/* 1. Header                                                     */}
        {/* ============================================================ */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="relative rounded-2xl overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 60% 30%, #F9A8D4 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, #E8788A 0%, transparent 50%)',
            }}
          />
          <div className="relative bg-white/70 dark:bg-[#2A1520]/70 backdrop-blur-md border border-[#F9D0DA]/50 dark:border-[#4A2535]/50 rounded-2xl px-6 py-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1">Your Journey</p>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                  <span className="gradient-text-animated">Activity Log</span>
                </h1>
                <p className="text-[#9B6B7B] dark:text-[#A07888] text-sm">
                  Track everything you do in NariAid
                </p>
              </div>
              <div className="shrink-0 ml-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] flex items-center justify-center shadow-lg shadow-[#E8788A]/15">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 2. Activity Stats                                             */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={1} gradient="from-[#E8788A] via-[#F9A8D4] to-[#FDA4AF]">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Activity Stats</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Your engagement at a glance</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-3.5 text-center">
                <motion.p
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                  className="text-2xl font-bold text-[#E8788A]"
                >
                  {stats.todayCount}
                </motion.p>
                <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Activities Today</p>
              </div>
              <div className="bg-gradient-to-br from-[#F5F3FF] to-[#FFF5F7] rounded-xl p-3.5 text-center">
                <motion.p
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                  className="text-2xl font-bold text-[#C084FC]"
                >
                  {stats.weekCount}
                </motion.p>
                <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">This Week</p>
              </div>
              <div className="bg-gradient-to-br from-[#F0FDF4] to-[#FFF5F7] rounded-xl p-3.5 text-center">
                <motion.p
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                  className="text-2xl font-bold text-[#34D399]"
                >
                  {stats.total}
                </motion.p>
                <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Total Activities</p>
              </div>
              <div className="bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FDF2F8] dark:to-[#2A1520] rounded-xl p-3.5 text-center">
                {stats.topCategory ? (
                  <>
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      {(() => {
                        const catInfo = getCategoryInfo(stats.topCategory.name)
                        const Icon = catInfo.icon
                        return <Icon className="w-3.5 h-3.5" style={{ color: catInfo.color }} />
                      })()}
                    </div>
                    <p className="text-xs font-bold text-[#4A1D2E] dark:text-[#F9D0DA] capitalize">{stats.topCategory.name.replace('-', ' ')}</p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Most Active</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-[#9B6B7B] dark:text-[#A07888]">--</p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Most Active</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 3. Category Filter                                            */}
        {/* ============================================================ */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                  <Filter className="w-4 h-4 text-[#C084FC]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Filter by Category</h2>
                </div>
              </div>
              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="text-xs text-[#E8788A] font-medium hover:opacity-80 transition-opacity"
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveFilter('all')}
                className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-all border ${
                  activeFilter === 'all'
                    ? 'bg-gradient-to-r from-[#E8788A] to-[#F9A8D4] text-white border-transparent shadow-sm'
                    : 'bg-[#FFF5F7] border-[#F9D0DA]/40 dark:border-[#4A2535]/40 text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]'
                }`}
              >
                All ({activities.length})
              </motion.button>
              {CATEGORIES.map((cat) => {
                const count = activities.filter(a => a.category === cat.value).length
                const Icon = cat.icon
                return (
                  <motion.button
                    key={cat.value}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setActiveFilter(cat.value)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all border ${
                      activeFilter === cat.value
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-[#FFF5F7] border-[#F9D0DA]/40 dark:border-[#4A2535]/40 text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]'
                    }`}
                    style={activeFilter === cat.value ? {
                      background: `linear-gradient(135deg, ${cat.color}, ${cat.color}99)`,
                    } : {}}
                  >
                    <Icon className="w-3 h-3" style={{ color: activeFilter === cat.value ? 'white' : cat.color }} />
                    {cat.label}
                    <span className={`text-[10px] ${activeFilter === cat.value ? 'text-white/80' : 'text-[#9B6B7B]/60'}`}>
                      ({count})
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 4. Activity Timeline                                          */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={3} gradient="from-[#C084FC] via-[#F9A8D4] to-[#E8788A]">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#C084FC]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Timeline</h2>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{filteredActivities.length} activities</p>
                </div>
              </div>

              {/* Clear History */}
              {activities.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={clearing}
                      className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] text-[#E8788A] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] hover:text-[#D4677A] h-auto py-1.5 px-3 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {clearing ? 'Clearing...' : 'Clear All'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl border-[#F9D0DA] dark:border-[#4A2535]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-[#4A1D2E] dark:text-[#F9D0DA] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[#E8788A]" />
                        Clear Activity History
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-[#9B6B7B] dark:text-[#A07888]">
                        This will permanently delete all your activity logs. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] text-[#9B6B7B] dark:text-[#A07888]">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearHistory}
                        className="rounded-xl bg-[#E8788A] text-white hover:bg-[#D4677A] border-0"
                      >
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {filteredActivities.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] dark:bg-[#3A2030] flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-7 h-7 text-[#F9A8D4]" />
                </div>
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] mb-1">No activities found</p>
                <p className="text-xs text-[#9B6B7B]/70">
                  {activeFilter !== 'all'
                    ? 'Try selecting a different category filter'
                    : 'Start using the app to see your activity history'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedActivities).map(([dateLabel, items]) => (
                  <div key={dateLabel}>
                    {/* Date header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-[#F9D0DA]/50" />
                      <span className="text-[10px] font-semibold text-[#9B6B7B] dark:text-[#A07888] uppercase tracking-wider px-2">
                        {dateLabel}
                      </span>
                      <div className="h-px flex-1 bg-[#F9D0DA]/50" />
                    </div>

                    {/* Timeline items */}
                    <div className="relative ml-4">
                      {/* Vertical line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-[#F9D0DA] via-[#F9D0DA]/60 to-transparent" />

                      <div className="space-y-3">
                        {items.map((activity, i) => {
                          const catInfo = getCategoryInfo(activity.category)
                          const CategoryIcon = catInfo.icon
                          const actionIcon = ACTION_ICONS[activity.action] || CheckCircle2
                          const actionColor = ACTION_COLORS[activity.action] || '#9B6B7B'

                          return (
                            <motion.div
                              key={activity.id}
                              custom={i}
                              variants={timelineItemVariants}
                              initial="hidden"
                              animate="visible"
                              className="relative pl-8"
                            >
                              {/* Timeline dot */}
                              <div
                                className="absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center z-10"
                                style={{ backgroundColor: `${catInfo.color}18` }}
                              >
                                <CategoryIcon className="w-3 h-3" style={{ color: catInfo.color }} />
                              </div>

                              {/* Left border line with category color */}
                              <div
                                className="absolute left-[10px] top-7 bottom-0 w-0.5"
                                style={{ backgroundColor: `${catInfo.color}30` }}
                              />

                              {/* Content */}
                              <motion.div
                                whileHover={{ scale: 1.01 }}
                                className="bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#FFF5F7]/40 dark:to-[#2A1520]/40 rounded-xl p-3 border border-[#F9D0DA]/20 glass-card-hover"
                                style={{ borderLeftWidth: '3px', borderLeftColor: catInfo.color }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Badge
                                        className="text-[9px] px-1.5 py-0 border-0 rounded-md font-medium capitalize"
                                        style={{
                                          backgroundColor: `${actionColor}15`,
                                          color: actionColor,
                                        }}
                                      >
                                        {activity.action}
                                      </Badge>
                                      <Badge
                                        className="text-[9px] px-1.5 py-0 border-0 rounded-md font-medium capitalize"
                                        style={{
                                          backgroundColor: `${catInfo.color}12`,
                                          color: catInfo.color,
                                        }}
                                      >
                                        {activity.category.replace('-', ' ')}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-[#4A1D2E] dark:text-[#F9D0DA] leading-snug">
                                      {activity.details || activity.action}
                                    </p>
                                  </div>
                                  <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] shrink-0 ml-2 mt-0.5">
                                    {formatTime(activity.createdAt)}
                                  </span>
                                </div>
                              </motion.div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GradientBorderCard>

      </div>
    </motion.div>
  )
}
