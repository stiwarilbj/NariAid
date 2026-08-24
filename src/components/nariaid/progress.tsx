'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { format, subDays, parseISO, differenceInDays } from 'date-fns'
import {
  TrendingUp,
  Sun,
  Zap,
  Moon,
  Heart,
  Award,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  Shield,
  Star,
  Flame,
  CalendarCheck,
  Trophy,
  Sparkles,
  BarChart3,
  Hash,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HealthLog {
  id: string
  date: string
  mood: number
  energy: number
  sleep: number
  stress: number
  pain: number
  symptoms: string
  notes: string
  waterIntake: number
}

type TimeRange = '7' | '30' | '90' | 'all'

interface ChartDataPoint {
  date: string
  label: string
  mood: number | null
  energy: number | null
  sleep: number | null
  stress: number | null
  pain: number | null
}

interface SymptomTrend {
  name: string
  count: number
  direction: 'improving' | 'worsening' | 'stable'
  change: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ElementType
  earned: boolean
  color: string
  gradient: string
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const pageVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
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
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
}

const numberVariants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.3 + i * 0.1,
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1] as const,
    },
  }),
}

// ---------------------------------------------------------------------------
// Animated number hook
// ---------------------------------------------------------------------------

function useCountUp(target: number, duration: number = 1200, delay: number = 0.3) {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    if (target === prevTarget.current) return
    prevTarget.current = target

    const startTime = performance.now() + delay * 1000
    const startVal = 0

    function tick(now: number) {
      const elapsed = now - startTime
      if (elapsed < 0) {
        requestAnimationFrame(tick)
        return
      }
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [target, duration, delay])

  return value
}

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------

function CustomChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number | null; color: string; dataKey: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white/95 dark:bg-[#2A1520]/95 backdrop-blur-md border border-[#F9D0DA] dark:border-[#4A2535] rounded-xl px-4 py-3 shadow-lg shadow-[#E8788A]/5">
      <p className="text-xs font-medium text-[#9B6B7B] dark:text-[#A07888] mb-2">{label}</p>
      {payload.map((entry, i) => {
        if (entry.value === null || entry.value === undefined) return null
        return (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[#6B3A4A] dark:text-[#C9A0B0] capitalize">{entry.name}:</span>
            <span className="font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{entry.value}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Symptom bar tooltip
// ---------------------------------------------------------------------------

function SymptomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { name: string; fill: string } }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white/95 dark:bg-[#2A1520]/95 backdrop-blur-md border border-[#F9D0DA] dark:border-[#4A2535] rounded-xl px-4 py-3 shadow-lg shadow-[#E8788A]/5">
      <p className="text-xs font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{label}</p>
      <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mt-1">Logged {payload[0].value} times</p>
    </div>
  )
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
      <div className="bg-white dark:bg-[#2A1520] rounded-[14px] h-full">{children}</div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main Progress Component
// ---------------------------------------------------------------------------

export default function Progress() {
  const { userName, setActiveTab } = useAppStore()

  // ---- State ----
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('30')

  // ---- Fetch data ----
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const daysParam = timeRange === 'all' ? 'all' : timeRange
      const res = await fetch(`/api/health-logs?days=${daysParam}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setHealthLogs(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch progress data:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---- Time range config ----
  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '7', label: '7 Days' },
    { value: '30', label: '30 Days' },
    { value: '90', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ]

  // ---- Build chart data ----
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (healthLogs.length === 0) return []

    const daysNum = timeRange === 'all' ? 365 : parseInt(timeRange, 10)

    return Array.from({ length: daysNum }, (_, i) => {
      const d = subDays(new Date(), daysNum - 1 - i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const label = format(d, daysNum <= 7 ? 'EEE' : 'MMM d')
      const log = healthLogs.find((l) => l.date === dateStr)

      return {
        date: dateStr,
        label,
        mood: log?.mood ?? null,
        energy: log?.energy ?? null,
        sleep: log?.sleep ?? null,
        stress: log?.stress ?? null,
        pain: log?.pain ?? null,
      }
    })
  }, [healthLogs, timeRange])

  // Chart data with only logged entries (for cleaner line charts)
  const loggedChartData = useMemo(() => {
    return chartData.filter((d) => d.mood !== null)
  }, [chartData])

  // ---- Averages ----
  const averages = useMemo(() => {
    const logged = healthLogs.filter((l) => l.mood > 0)
    if (logged.length === 0) return { mood: 0, energy: 0, sleep: 0, stress: 0, pain: 0 }

    const sum = (key: keyof Pick<HealthLog, 'mood' | 'energy' | 'sleep' | 'stress' | 'pain'>) =>
      logged.reduce((acc, l) => acc + l[key], 0) / logged.length

    return {
      mood: Math.round(sum('mood') * 10) / 10,
      energy: Math.round(sum('energy') * 10) / 10,
      sleep: Math.round(sum('sleep') * 10) / 10,
      stress: Math.round(sum('stress') * 10) / 10,
      pain: Math.round(sum('pain') * 10) / 10,
    }
  }, [healthLogs])

  // ---- Health Score (0-100) ----
  // Formula per spec: (mood+energy+sleep)*10/3 minus adjustments for stress/pain
  const healthScore = useMemo(() => {
    if (healthLogs.length === 0) return 0
    const baseScore = ((averages.mood + averages.energy + averages.sleep) * 10) / 3
    const stressAdjustment = (averages.stress / 10) * 15
    const painAdjustment = (averages.pain / 10) * 10
    return Math.round(Math.max(0, Math.min(100, baseScore - stressAdjustment - painAdjustment)))
  }, [healthLogs, averages])

  // Animated health score display
  const animatedScore = useCountUp(healthScore, 1400, 0.3)

  // ---- Streak calculations ----
  const streakInfo = useMemo(() => {
    const dates = healthLogs.map((l) => l.date).sort()
    let maxStreak = 0
    let currentStreak = 0

    if (dates.length > 0) {
      currentStreak = 1
      maxStreak = 1
      for (let i = 1; i < dates.length; i++) {
        const diff = differenceInDays(parseISO(dates[i]), parseISO(dates[i - 1]))
        if (diff === 1) {
          currentStreak++
          maxStreak = Math.max(maxStreak, currentStreak)
        } else if (diff > 1) {
          currentStreak = 1
        }
      }

      // Check if current streak extends to today
      const today = format(new Date(), 'yyyy-MM-dd')
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      const lastDate = dates[dates.length - 1]
      if (lastDate !== today && lastDate !== yesterday) {
        currentStreak = 0
      }
    }

    return { maxStreak, currentStreak, totalLogs: healthLogs.length }
  }, [healthLogs])

  // ---- Trends (compare first half vs second half of data) ----
  const trends = useMemo(() => {
    if (loggedChartData.length < 4) return { mood: 0, energy: 0, sleep: 0 }

    const mid = Math.floor(loggedChartData.length / 2)
    const firstHalf = loggedChartData.slice(0, mid)
    const secondHalf = loggedChartData.slice(mid)

    const avg = (arr: ChartDataPoint[], key: keyof Pick<ChartDataPoint, 'mood' | 'energy' | 'sleep'>) => {
      const vals = arr.map((d) => d[key]).filter((v): v is number => v !== null)
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    }

    return {
      mood: Math.round((avg(secondHalf, 'mood') - avg(firstHalf, 'mood')) * 10) / 10,
      energy: Math.round((avg(secondHalf, 'energy') - avg(firstHalf, 'energy')) * 10) / 10,
      sleep: Math.round((avg(secondHalf, 'sleep') - avg(firstHalf, 'sleep')) * 10) / 10,
    }
  }, [loggedChartData])

  // ---- Symptom trends (comparison) ----
  const symptomTrends = useMemo<SymptomTrend[]>(() => {
    if (healthLogs.length < 2) return []

    const mid = Math.floor(healthLogs.length / 2)
    // Assume array may be in any order; sort by date first
    const sorted = [...healthLogs].sort((a, b) => a.date.localeCompare(b.date))
    const olderHalf = sorted.slice(0, mid)
    const newerHalf = sorted.slice(mid)

    const countSymptoms = (logs: HealthLog[]) => {
      const counts: Record<string, number> = {}
      logs.forEach((l) => {
        if (!l.symptoms) return
        l.symptoms.split(',').forEach((s) => {
          const trimmed = s.trim().toLowerCase()
          if (trimmed) counts[trimmed] = (counts[trimmed] || 0) + 1
        })
      })
      return counts
    }

    const olderCounts = countSymptoms(olderHalf)
    const newerCounts = countSymptoms(newerHalf)

    const allSymptoms = new Set([...Object.keys(olderCounts), ...Object.keys(newerCounts)])

    const result: SymptomTrend[] = []
    allSymptoms.forEach((symptom) => {
      const older = olderCounts[symptom] || 0
      const newer = newerCounts[symptom] || 0
      const change = newer - older

      let direction: SymptomTrend['direction'] = 'stable'
      if (change > 0) direction = 'worsening'
      else if (change < 0) direction = 'improving'

      result.push({
        name: symptom.charAt(0).toUpperCase() + symptom.slice(1),
        count: newer + older,
        direction,
        change: Math.abs(change),
      })
    })

    return result.sort((a, b) => b.count - a.count).slice(0, 8)
  }, [healthLogs])

  // Symptom data for BarChart
  const symptomBarData = useMemo(() => {
    return symptomTrends.map((s) => ({
      name: s.name.length > 10 ? s.name.slice(0, 10) + '...' : s.name,
      count: s.count,
      direction: s.direction,
    }))
  }, [symptomTrends])

  // ---- Achievements ----
  const achievements = useMemo<Achievement[]>(() => {
    const { maxStreak, totalLogs } = streakInfo

    // Check for perfect week (all mood >= 7 in any 7-day span)
    let hasPerfectWeek = false
    if (loggedChartData.length >= 7) {
      for (let i = 6; i < loggedChartData.length; i++) {
        const weekSlice = loggedChartData.slice(i - 6, i + 1)
        if (weekSlice.every((d) => d.mood !== null && d.mood >= 7)) {
          hasPerfectWeek = true
          break
        }
      }
    }

    // Check for high energy streak (energy >= 8 for 3+ consecutive days)
    let highEnergyStreak = 0
    let tempStreak = 0
    loggedChartData.forEach((d) => {
      if (d.energy !== null && d.energy >= 8) {
        tempStreak++
        highEnergyStreak = Math.max(highEnergyStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    })

    return [
      {
        id: 'first-log',
        title: 'First Step',
        description: 'Logged your first health entry',
        icon: Star,
        earned: totalLogs >= 1,
        color: '#E8788A',
        gradient: 'from-[#E8788A] to-[#F9A8D4]',
      },
      {
        id: 'ten-logs',
        title: 'Getting Started',
        description: 'Logged 10 health entries',
        icon: Target,
        earned: totalLogs >= 10,
        color: '#FDA4AF',
        gradient: 'from-[#FDA4AF] to-[#E8788A]',
      },
      {
        id: 'week-streak',
        title: 'Consistency Star',
        description: '7-day logging streak achieved',
        icon: Flame,
        earned: maxStreak >= 7,
        color: '#F9A8D4',
        gradient: 'from-[#F9A8D4] to-[#C084FC]',
      },
      {
        id: 'thirty-logs',
        title: 'Habit Builder',
        description: 'Logged 30 health entries',
        icon: CalendarCheck,
        earned: totalLogs >= 30,
        color: '#818CF8',
        gradient: 'from-[#818CF8] to-[#C084FC]',
      },
      {
        id: 'month-streak',
        title: 'Dedication Champion',
        description: '30-day logging streak achieved',
        icon: Trophy,
        earned: maxStreak >= 30,
        color: '#C084FC',
        gradient: 'from-[#C084FC] to-[#818CF8]',
      },
      {
        id: 'perfect-week',
        title: 'Golden Week',
        description: '7 consecutive days of mood 7+',
        icon: Award,
        earned: hasPerfectWeek,
        color: '#F59E0B',
        gradient: 'from-[#F59E0B] to-[#FBBF24]',
      },
      {
        id: 'high-energy',
        title: 'Energy Surge',
        description: '3+ consecutive days of energy 8+',
        icon: Zap,
        earned: highEnergyStreak >= 3,
        color: '#10B981',
        gradient: 'from-[#10B981] to-[#34D399]',
      },
      {
        id: 'health-guru',
        title: 'Health Guru',
        description: 'Achieved a health score of 75+',
        icon: Shield,
        earned: healthScore >= 75,
        color: '#E8788A',
        gradient: 'from-[#E8788A] to-[#C084FC]',
      },
    ]
  }, [streakInfo, loggedChartData, healthScore])

  // ---- Helpers ----
  const getTrendIcon = (val: number) => {
    if (val > 0.3) return <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
    if (val < -0.3) return <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
    return <Minus className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
  }

  const getTrendColor = (val: number, invert = false) => {
    const positive = invert ? val < -0.3 : val > 0.3
    const negative = invert ? val > 0.3 : val < -0.3
    if (positive) return 'text-emerald-600'
    if (negative) return 'text-rose-400'
    return 'text-[#9B6B7B] dark:text-[#A07888]'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Great'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    if (score >= 20) return 'Needs Attention'
    return 'Critical'
  }

  const earnedCount = achievements.filter((a) => a.earned).length
  const hasSingleEntry = healthLogs.length === 1
  const firstBaseline = healthLogs[0] ?? null

  // ---- Chart axis interval helper ----
  const xInterval = timeRange === '7' ? 0 : timeRange === '30' ? 3 : 7

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0D12] px-4 py-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white/60 dark:bg-[#2A1520]/60 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-[#F9D0DA]/40 dark:bg-[#4A2535]/40 rounded w-1/3 mb-4" />
              <div className="h-32 bg-[#F9D0DA]/20 dark:bg-[#4A2535]/20 rounded w-full mb-2" />
              <div className="h-3 bg-[#F9D0DA]/30 dark:bg-[#4A2535]/30 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---- No data state ----
  if (healthLogs.length === 0) {
    return (
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0D12] flex flex-col items-center justify-center px-6 pb-24"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#E8788A]/10 to-[#F9A8D4]/10 flex items-center justify-center mb-6">
          <TrendingUp className="w-10 h-10 text-[#E8788A]" />
        </div>
        <h2 className="text-xl font-semibold text-[#4A1D2E] dark:text-[#F9D0DA] mb-2">No Progress Data Yet</h2>
        <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] text-center max-w-xs">
          Start logging your health to see your progress trends and achievements here.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('health-log')}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-[#E8788A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#E8788A]/20"
        >
          Add your first entry
        </button>
      </motion.div>
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
      {/* ================================================================ */}
      {/* Decorative background blobs                                       */}
      {/* ================================================================ */}
      <div
        className="absolute top-[-60px] right-[-50px] w-[260px] h-[260px] rounded-full opacity-25 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #F9A8D4 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute top-[400px] left-[-70px] w-[200px] h-[200px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute bottom-[200px] right-[-30px] w-[180px] h-[180px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #E8788A 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* ================================================================ */}
      {/* Content                                                           */}
      {/* ================================================================ */}
      <div className="relative z-10 px-4 py-6 pb-24 max-w-2xl mx-auto space-y-5">
        {/* ============================================================ */}
        {/* 1. Header with Time Range Selector                           */}
        {/* ============================================================ */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="relative rounded-2xl overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-30 dark:opacity-15 dark:opacity-5 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 80% 30%, #F9A8D4 0%, transparent 60%), radial-gradient(ellipse at 20% 70%, #C084FC 0%, transparent 50%)',
            }}
          />
          <div className="relative bg-white/70 dark:bg-[#2A1520]/70 backdrop-blur-md border border-[#F9D0DA]/50 dark:border-[#4A2535]/50 rounded-2xl px-6 py-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] flex items-center justify-center shadow-lg shadow-[#E8788A]/15">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text-animated">Your Progress</h1>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Track your health journey over time</p>
                </div>
              </div>
              {/* Quick stat badges */}
              <div className="flex items-center gap-2">
                <div className="bg-[#FFF0F3] dark:bg-[#3A2030] rounded-lg px-2.5 py-1 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-[#E8788A]" />
                  <span className="text-xs font-semibold text-[#E8788A]">{streakInfo.totalLogs}</span>
                </div>
                {streakInfo.currentStreak > 0 && (
                  <div className="bg-gradient-to-r from-[#E8788A]/10 to-[#F9A8D4]/10 rounded-lg px-2.5 py-1 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-[#E8788A]" />
                    <span className="text-xs font-semibold text-[#E8788A]">{streakInfo.currentStreak}d</span>
                  </div>
                )}
              </div>
            </div>

            {/* Time Range Selector - pill buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {timeRangeOptions.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTimeRange(opt.value)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                    timeRange === opt.value
                      ? 'bg-gradient-to-r from-[#E8788A] to-[#F0869A] text-white shadow-sm shadow-[#E8788A]/20'
                      : 'bg-[#FFF0F3] dark:bg-[#3A2030] text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FDDAE2] dark:hover:bg-[#4A2535] dark:bg-[#4A2535] hover:text-[#E8788A]'
                  }`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {hasSingleEntry && firstBaseline && (
          <motion.div
            custom={0.5}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-[#E8788A]/25 bg-white px-5 py-4 shadow-sm dark:border-[#F0869A]/25 dark:bg-[#2A1520]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030]">
                <Sparkles className="h-4 w-4 text-[#E8788A]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">Your baseline is ready</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#8F5366] dark:text-[#A07888]">
                  This first entry is now visible in every chart. Add another day to begin seeing direction and change.
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: 'Mood', value: firstBaseline.mood, color: '#E8788A' },
                { label: 'Energy', value: firstBaseline.energy, color: '#C084FC' },
                { label: 'Sleep', value: firstBaseline.sleep, color: '#60A5FA' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl bg-[#FFF7F9] px-3 py-2 text-center dark:bg-[#3A2030]/50">
                  <p className="text-lg font-bold" style={{ color: metric.color }}>{metric.value}</p>
                  <p className="text-[10px] font-medium text-[#9B6B7B] dark:text-[#A07888]">{metric.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* Quick Summary Row                                            */}
        {/* ============================================================ */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: 'Mood', value: averages.mood, color: '#E8788A', icon: Sun },
            { label: 'Energy', value: averages.energy, color: '#F9A8D4', icon: Zap },
            { label: 'Sleep', value: averages.sleep, color: '#C084FC', icon: Moon },
            { label: 'Score', value: healthScore, color: '#E8788A', icon: Heart },
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.label}
                custom={idx + 0.5}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl border border-[#F9D0DA]/50 dark:border-[#4A2535]/50 p-3 text-center"
              >
                <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: item.color }} />
                <p className="text-lg font-bold" style={{ color: item.color }}>
                  {item.label === 'Score' ? animatedScore : item.value}
                </p>
                <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] font-medium">{item.label}</p>
              </motion.div>
            )
          })}
        </div>

        {/* ============================================================ */}
        {/* 6. Health Score Card                                          */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={1} gradient="from-[#E8788A] via-[#F9A8D4] to-[#C084FC]" className="animated-gradient-border card-press">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <Heart className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Health Score</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Calculated from your daily metrics</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Score Circle - SVG with animated stroke */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="#FFF0F3"
                    strokeWidth="10"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 52 - (2 * Math.PI * 52 * healthScore) / 100,
                    }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#E8788A" />
                      <stop offset="50%" stopColor="#F9A8D4" />
                      <stop offset="100%" stopColor="#C084FC" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    custom={0}
                    variants={numberVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-3xl font-bold text-shimmer"
                  >
                    {animatedScore}
                  </motion.span>
                  <span className="text-[9px] text-[#9B6B7B] dark:text-[#A07888] font-medium">
                    {getScoreLabel(healthScore)}
                  </span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="flex-1 space-y-3">
                {[
                  { label: 'Mood', value: averages.mood, max: 10, color: '#E8788A' },
                  { label: 'Energy', value: averages.energy, max: 10, color: '#F9A8D4' },
                  { label: 'Sleep', value: averages.sleep, max: 10, color: '#C084FC' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">{item.label}</span>
                      <span className="text-xs font-semibold" style={{ color: item.color }}>
                        {item.value}/{item.max}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#FFF0F3] dark:bg-[#3A2030] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / item.max) * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#9B6B7B] dark:text-[#A07888]">Stress:</span>
                    <span className="font-medium text-rose-400">{averages.stress}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#9B6B7B] dark:text-[#A07888]">Pain:</span>
                    <span className="font-medium text-orange-400">{averages.pain}</span>
                  </div>
                </div>
                <p className="text-[9px] text-[#9B6B7B]/70 leading-tight pt-0.5">
                  Score = (mood+energy+sleep) x 10 / 3 minus stress & pain adjustments
                </p>
              </div>
            </div>
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 2. Mood Trend LineChart                                      */}
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
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-[#E8788A]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Mood Trend</h2>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Your emotional wellbeing over time</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {getTrendIcon(trends.mood)}
                <span className={`text-xs font-medium ${getTrendColor(trends.mood)}`}>
                  {trends.mood > 0 ? '+' : ''}{trends.mood}
                </span>
              </div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loggedChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="moodGradientFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8788A" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#E8788A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F9D0DA" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9B6B7B' }}
                    axisLine={{ stroke: '#F9D0DA' }}
                    tickLine={false}
                    interval={xInterval}
                  />
                  <YAxis
                    domain={[1, 10]}
                    tick={{ fontSize: 10, fill: '#9B6B7B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="mood"
                    stroke="none"
                    fill="url(#moodGradientFill)"
                    fillOpacity={1}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke="#E8788A"
                    strokeWidth={2.5}
                    dot={hasSingleEntry ? { r: 5, fill: '#E8788A', stroke: '#fff', strokeWidth: 2 } : false}
                    activeDot={{ r: 5, fill: '#E8788A', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 3. Energy Trend LineChart                                    */}
        {/* ============================================================ */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
        >
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F9A8D4]/15 to-[#C084FC]/15 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#F9A8D4]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Energy Trend</h2>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Your vitality and energy levels</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {getTrendIcon(trends.energy)}
                <span className={`text-xs font-medium ${getTrendColor(trends.energy)}`}>
                  {trends.energy > 0 ? '+' : ''}{trends.energy}
                </span>
              </div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loggedChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="energyGradientFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F9A8D4" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F9A8D4" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F9D0DA" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9B6B7B' }}
                    axisLine={{ stroke: '#F9D0DA' }}
                    tickLine={false}
                    interval={xInterval}
                  />
                  <YAxis
                    domain={[1, 10]}
                    tick={{ fontSize: 10, fill: '#9B6B7B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="energy"
                    stroke="none"
                    fill="url(#energyGradientFill)"
                    fillOpacity={1}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="#F9A8D4"
                    strokeWidth={2.5}
                    dot={hasSingleEntry ? { r: 5, fill: '#F9A8D4', stroke: '#fff', strokeWidth: 2 } : false}
                    activeDot={{ r: 5, fill: '#F9A8D4', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 4. Sleep Quality Trend AreaChart                             */}
        {/* ============================================================ */}
        <motion.div
          custom={4}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
        >
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#818CF8]/15 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-[#C084FC]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Sleep Quality</h2>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">How well you have been resting</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {getTrendIcon(trends.sleep)}
                <span className={`text-xs font-medium ${getTrendColor(trends.sleep)}`}>
                  {trends.sleep > 0 ? '+' : ''}{trends.sleep}
                </span>
              </div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={loggedChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="sleepGradientFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C084FC" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#C084FC" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#C084FC" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F9D0DA" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9B6B7B' }}
                    axisLine={{ stroke: '#F9D0DA' }}
                    tickLine={false}
                    interval={xInterval}
                  />
                  <YAxis
                    domain={[1, 10]}
                    tick={{ fontSize: 10, fill: '#9B6B7B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="sleep"
                    stroke="#C084FC"
                    strokeWidth={2.5}
                    fill="url(#sleepGradientFill)"
                    dot={hasSingleEntry ? { r: 5, fill: '#C084FC', stroke: '#fff', strokeWidth: 2 } : false}
                    activeDot={{ r: 5, fill: '#C084FC', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 5. Combined Overview Chart                                   */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={5} gradient="from-[#E8788A] via-[#F9A8D4] to-[#C084FC]" className="shimmer-shine card-press">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#C084FC]/15 flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Combined Overview</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">All metrics in one view</p>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="flex items-center justify-center gap-5 mb-3">
              {[
                { name: 'Mood', color: '#E8788A', icon: Sun },
                { name: 'Energy', color: '#F9A8D4', icon: Zap },
                { name: 'Sleep', color: '#C084FC', icon: Moon },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    <span className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">{item.name}</span>
                  </div>
                )
              })}
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loggedChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="comboMoodFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8788A" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#E8788A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="comboEnergyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F9A8D4" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#F9A8D4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="comboSleepFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C084FC" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#C084FC" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F9D0DA" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9B6B7B' }}
                    axisLine={{ stroke: '#F9D0DA' }}
                    tickLine={false}
                    interval={xInterval}
                  />
                  <YAxis
                    domain={[1, 10]}
                    tick={{ fontSize: 10, fill: '#9B6B7B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="mood" stroke="none" fill="url(#comboMoodFill)" connectNulls />
                  <Area type="monotone" dataKey="energy" stroke="none" fill="url(#comboEnergyFill)" connectNulls />
                  <Area type="monotone" dataKey="sleep" stroke="none" fill="url(#comboSleepFill)" connectNulls />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke="#E8788A"
                    strokeWidth={2}
                    dot={hasSingleEntry ? { r: 4, fill: '#E8788A', stroke: '#fff', strokeWidth: 2 } : false}
                    activeDot={{ r: 4, fill: '#E8788A', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="#F9A8D4"
                    strokeWidth={2}
                    dot={hasSingleEntry ? { r: 4, fill: '#F9A8D4', stroke: '#fff', strokeWidth: 2 } : false}
                    activeDot={{ r: 4, fill: '#F9A8D4', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="sleep"
                    stroke="#C084FC"
                    strokeWidth={2}
                    dot={hasSingleEntry ? { r: 4, fill: '#C084FC', stroke: '#fff', strokeWidth: 2 } : false}
                    activeDot={{ r: 4, fill: '#C084FC', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Avg Mood', value: averages.mood, color: '#E8788A' },
                { label: 'Avg Energy', value: averages.energy, color: '#F9A8D4' },
                { label: 'Avg Sleep', value: averages.sleep, color: '#C084FC' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-3 text-center"
                >
                  <p className="text-lg font-bold" style={{ color: item.color }}>
                    {item.value}
                  </p>
                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 7. Achievements / Milestones                                 */}
        {/* ============================================================ */}
        <motion.div
          custom={6}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
        >
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F9A8D4]/15 to-[#FBBF24]/15 flex items-center justify-center">
                  <Award className="w-4 h-4 text-[#F9A8D4]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Achievements</h2>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                    {earnedCount} of {achievements.length} earned
                  </p>
                </div>
              </div>
              {/* Current / Max streak */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-[#E8788A]">{streakInfo.currentStreak}</p>
                  <p className="text-[9px] text-[#9B6B7B] dark:text-[#A07888]">Current</p>
                </div>
                <div className="w-px h-8 bg-[#F9D0DA]/60" />
                <div className="text-center">
                  <p className="text-lg font-bold text-[#C084FC]">{streakInfo.maxStreak}</p>
                  <p className="text-[9px] text-[#9B6B7B">Best</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1.5">
                <span>Completion</span>
                <span>{Math.round((earnedCount / achievements.length) * 100)}%</span>
              </div>
              <div className="relative h-2 bg-[#FFF0F3] dark:bg-[#3A2030] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(earnedCount / achievements.length) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#E8788A] via-[#F9A8D4] to-[#C084FC]"
                />
              </div>
            </div>

            {/* Achievement grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {achievements.map((achievement, i) => {
                const Icon = achievement.icon
                return (
                  <motion.div
                    key={achievement.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.05 }}
                    className={`relative rounded-xl p-3.5 text-center transition-all duration-300 glass-card-hover card-press ${
                      achievement.earned
                        ? 'bg-gradient-to-br from-white to-[#FFF0F3] border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 shadow-sm'
                        : 'bg-[#FFF0F3] dark:bg-[#3A2030]/40 border border-[#F9D0DA]/20 opacity-50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                        achievement.earned
                          ? `bg-gradient-to-br ${achievement.gradient} shadow-sm`
                          : 'bg-[#F9D0DA]/30'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${achievement.earned ? 'text-white' : 'text-[#9B6B7B] dark:text-[#A07888]'}`}
                      />
                    </div>
                    <p
                      className={`text-xs font-semibold mb-0.5 ${
                        achievement.earned ? 'text-[#4A1D2E] dark:text-[#F9D0DA]' : 'text-[#9B6B7B] dark:text-[#A07888]'
                      }`}
                    >
                      {achievement.title}
                    </p>
                    <p className="text-[9px] text-[#9B6B7B] dark:text-[#A07888] leading-tight">{achievement.description}</p>
                    {achievement.earned && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-[#E8788A] to-[#F9A8D4] flex items-center justify-center">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 8. Symptom Trends - Bar Chart + List                         */}
        {/* ============================================================ */}
        <motion.div
          custom={7}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#FDA4AF]/15 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Symptom Trends</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Which symptoms are improving or worsening</p>
              </div>
            </div>

            {symptomTrends.length > 0 ? (
              <>
                {/* Bar chart for frequency comparison */}
                {symptomBarData.length > 0 && (
                  <div className="h-44 mb-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={symptomBarData}
                        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="symptomBarImproving" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0.7} />
                          </linearGradient>
                          <linearGradient id="symptomBarWorsening" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FB7185" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.7} />
                          </linearGradient>
                          <linearGradient id="symptomBarStable" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F9A8D4" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#E8788A" stopOpacity={0.7} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F9D0DA" strokeOpacity={0.4} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 9, fill: '#9B6B7B' }}
                          axisLine={{ stroke: '#F9D0DA' }}
                          tickLine={false}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#9B6B7B' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<SymptomBarTooltip />} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                          {symptomBarData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.direction === 'improving'
                                  ? 'url(#symptomBarImproving)'
                                  : entry.direction === 'worsening'
                                  ? 'url(#symptomBarWorsening)'
                                  : 'url(#symptomBarStable)'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Detail list */}
                <div className="space-y-2.5">
                  {symptomTrends.map((symptom, i) => (
                    <motion.div
                      key={symptom.name}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-3 bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#FFF5F7]/40 dark:to-[#2A1520]/40 rounded-xl p-3"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          symptom.direction === 'improving'
                            ? 'bg-emerald-50'
                            : symptom.direction === 'worsening'
                            ? 'bg-rose-50'
                            : 'bg-[#FFF0F3] dark:bg-[#3A2030]'
                        }`}
                      >
                        {symptom.direction === 'improving' ? (
                          <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                        ) : symptom.direction === 'worsening' ? (
                          <ArrowUpRight className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Minus className="w-4 h-4 text-[#9B6B7B] dark:text-[#A07888]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">{symptom.name}</p>
                          <Badge
                            className={`text-[9px] px-2 py-0 border-0 rounded-md font-medium ${
                              symptom.direction === 'improving'
                                ? 'bg-emerald-50 text-emerald-600'
                                : symptom.direction === 'worsening'
                                ? 'bg-rose-50 text-rose-500'
                                : 'bg-[#FFF0F3] dark:bg-[#3A2030] text-[#9B6B7B] dark:text-[#A07888]'
                            }`}
                          >
                            {symptom.direction === 'improving'
                              ? 'Improving'
                              : symptom.direction === 'worsening'
                              ? 'Worsening'
                              : 'Stable'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-[#FFF0F3] dark:bg-[#3A2030] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (symptom.count / healthLogs.length) * 100 * 2)}%`,
                              }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
                              className="h-full rounded-full"
                              style={{
                                backgroundColor:
                                  symptom.direction === 'improving'
                                    ? '#10B981'
                                    : symptom.direction === 'worsening'
                                    ? '#FB7185'
                                    : '#F9A8D4',
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] shrink-0">
                            {symptom.count}x logged
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-5 pt-3">
                  <div className="flex items-center gap-1.5">
                    <ArrowDownRight className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Improving</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpRight className="w-3 h-3 text-rose-400" />
                    <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Worsening</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Minus className="w-3 h-3 text-[#9B6B7B] dark:text-[#A07888]" />
                    <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Stable</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F3] dark:bg-[#3A2030] flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-[#F9A8D4]" />
                </div>
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">No symptom data available</p>
                <p className="text-xs text-[#9B6B7B]/70 mt-1">
                  Log symptoms with your health entries to track trends
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
