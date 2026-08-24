'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, differenceInDays, addDays, parseISO, isValid } from 'date-fns'
import {
  Sun,
  Moon,
  Zap,
  Heart,
  Clock,
  Bell,
  CalendarDays,
  ClipboardList,
  TrendingUp,
  ChevronRight,
  Activity,
  Droplets,
  Sparkles,
  AlertCircle,
  Brain,
  MessageCircle,
  ShieldCheck,
  BarChart3,
  Check,
  LayoutGrid,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react'
import { useAppStore, type DashboardDensity, type DashboardSection, type DashboardWidgetId } from '@/store/app-store'
import CycleRecommendations from './cycle-recommendations'
import MoodHeatmap from './mood-heatmap'
import DailyHealthTip from './daily-health-tip'
import HydrationTracker from './hydration-tracker'
import HealthScoreWidget from './health-score-widget'
import SymptomQuickLog from './symptom-quick-log'
import PeriodCountdown from './period-countdown'
import HealthJournal from './health-journal'
import SleepAnalysis from './sleep-analysis'
import MedicationTracker from './medication-tracker'
import NutritionTracker from './nutrition-tracker'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getCyclePrediction, getCycleRiskAssessment, type CyclePrediction, type CycleRiskAssessment } from '@/lib/cycle-prediction'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileData {
  id: string
  name: string
  cycleLength: number
  lastPeriodStart: string
  age: number
  lifeStage: string
}

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

interface Reminder {
  id: string
  title: string
  description: string
  time: string
  frequency: string
  category: string
  active: boolean
}

const dashboardSections: { id: DashboardSection; label: string; icon: React.ElementType }[] = [
  { id: 'today', label: 'Today', icon: LayoutGrid },
  { id: 'insights', label: 'Trends', icon: BarChart3 },
  { id: 'tools', label: 'Trackers', icon: Wrench },
]

const dashboardWidgetOptions: { id: DashboardWidgetId; label: string; section: DashboardSection }[] = [
  { id: 'daily-tip', label: 'Tip of the day', section: 'today' },
  { id: 'check-in', label: 'Check-in', section: 'today' },
  { id: 'health-score', label: 'Health score', section: 'today' },
  { id: 'today-summary', label: 'Logged signals', section: 'today' },
  { id: 'period-countdown', label: 'Next period', section: 'today' },
  { id: 'health-guidance', label: 'Health guidance', section: 'today' },
  { id: 'reminders', label: 'Reminders', section: 'today' },
  { id: 'ai-insights', label: 'Smart suggestions', section: 'insights' },
  { id: 'weekly-trends', label: 'Weekly patterns', section: 'insights' },
  { id: 'mood-heatmap', label: 'Mood history', section: 'insights' },
  { id: 'cycle-overview', label: 'Cycle status', section: 'insights' },
  { id: 'recommendations', label: 'Cycle tips', section: 'insights' },
  { id: 'journal', label: 'Journal history', section: 'insights' },
  { id: 'phase-note', label: 'Phase note', section: 'insights' },
  { id: 'hydration', label: 'Hydration', section: 'tools' },
  { id: 'medication', label: 'Medication', section: 'tools' },
  { id: 'symptoms', label: 'Symptoms', section: 'tools' },
  { id: 'sleep', label: 'Sleep', section: 'tools' },
  { id: 'nutrition', label: 'Nutrition', section: 'tools' },
  { id: 'quick-actions', label: 'Quick actions', section: 'tools' },
]

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const pageVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

const cardVariants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
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

// ---------------------------------------------------------------------------
// Helper: cycle phase calculation
// ---------------------------------------------------------------------------

function getCycleInfo(cycleLength: number, lastPeriodStart: string) {
  if (!lastPeriodStart) {
    return { cycleDay: 0, phase: 'Unknown', nextPeriod: '', daysUntilNext: 0, phaseColor: '#9B6B7B' }
  }

  const lastStart = parseISO(lastPeriodStart)
  if (!isValid(lastStart)) {
    return { cycleDay: 0, phase: 'Unknown', nextPeriod: '', daysUntilNext: 0, phaseColor: '#9B6B7B' }
  }

  const today = new Date()
  const daysSincePeriod = differenceInDays(today, lastStart)
  const cycleDay = ((daysSincePeriod % cycleLength) + cycleLength) % cycleLength + 1

  let phase: string
  let phaseColor: string

  if (cycleDay <= 5) {
    phase = 'Menstrual'
    phaseColor = '#E8788A'
  } else if (cycleDay <= 13) {
    phase = 'Follicular'
    phaseColor = '#F9A8D4'
  } else if (cycleDay <= 16) {
    phase = 'Ovulation'
    phaseColor = '#C084FC'
  } else {
    phase = 'Luteal'
    phaseColor = '#FDA4AF'
  }

  const nextPeriodDate = addDays(lastStart, cycleLength)
  const daysUntilNext = Math.max(0, differenceInDays(nextPeriodDate, today))

  return {
    cycleDay,
    phase,
    nextPeriod: format(nextPeriodDate, 'MMM d, yyyy'),
    daysUntilNext,
    phaseColor,
  }
}

// ---------------------------------------------------------------------------
// Helper: format slider labels
// ---------------------------------------------------------------------------

function getMoodLabel(val: number): string {
  if (val <= 2) return 'Very Low'
  if (val <= 4) return 'Low'
  if (val <= 6) return 'Moderate'
  if (val <= 8) return 'Good'
  return 'Excellent'
}

function getEnergyLabel(val: number): string {
  if (val <= 2) return 'Exhausted'
  if (val <= 4) return 'Low'
  if (val <= 6) return 'Steady'
  if (val <= 8) return 'Energized'
  return 'Vibrant'
}

function getSleepLabel(val: number): string {
  if (val <= 2) return 'Very Poor'
  if (val <= 4) return 'Poor'
  if (val <= 6) return 'Fair'
  if (val <= 8) return 'Good'
  return 'Restful'
}

// ---------------------------------------------------------------------------
// Helper: AI Health Insights generation (local analysis, no external API)
// ---------------------------------------------------------------------------

interface HealthInsight {
  id: string
  text: string
  color: string
  category: 'mood' | 'sleep' | 'energy' | 'positive' | 'hydration'
}

function generateHealthInsights(logs: HealthLog[]): HealthInsight[] {
  if (!logs || logs.length === 0) return []

  const insights: HealthInsight[] = []

  // Filter to last 7 days of logs
  const now = new Date()
  const sevenDaysAgo = format(addDays(now, -7), 'yyyy-MM-dd')
  const recentLogs = logs.filter((l) => l.date >= sevenDaysAgo)

  if (recentLogs.length === 0) return []

  // ----- Mood trend analysis -----
  if (recentLogs.length >= 3) {
    const last3 = recentLogs.slice(0, 3)
    const moodValues = last3.map((l) => l.mood)
    const isImproving = moodValues[0] < moodValues[1] && moodValues[1] < moodValues[2]
    const isDeclining = moodValues[0] > moodValues[1] && moodValues[1] > moodValues[2]

    if (isImproving) {
      insights.push({
        id: 'mood-improving',
        text: 'Your mood has been improving over the last 3 days',
        color: '#E8788A',
        category: 'mood',
      })
    } else if (isDeclining) {
      insights.push({
        id: 'mood-declining',
        text: 'Your mood has been dipping recently — consider a self-care moment',
        color: '#E8788A',
        category: 'mood',
      })
    }
  }

  // ----- Sleep mid-week pattern -----
  if (recentLogs.length >= 4) {
    const logsWithDayOfWeek = recentLogs.map((l) => ({
      ...l,
      dayOfWeek: parseISO(l.date).getDay(), // 0=Sun, 1=Mon, ..., 6=Sat
    }))
    const midWeek = logsWithDayOfWeek.filter((l) => l.dayOfWeek >= 2 && l.dayOfWeek <= 4) // Tue-Thu
    const otherDays = logsWithDayOfWeek.filter((l) => l.dayOfWeek < 2 || l.dayOfWeek > 4)

    if (midWeek.length >= 2 && otherDays.length >= 2) {
      const midWeekAvg = midWeek.reduce((sum, l) => sum + l.sleep, 0) / midWeek.length
      const otherAvg = otherDays.reduce((sum, l) => sum + l.sleep, 0) / otherDays.length
      if (midWeekAvg < otherAvg - 1) {
        insights.push({
          id: 'sleep-midweek',
          text: 'Your sleep quality tends to drop mid-week',
          color: '#C084FC',
          category: 'sleep',
        })
      }
    }
  }

  // ----- Consistency recognition -----
  if (recentLogs.length >= 5) {
    insights.push({
      id: 'consistency',
      text: `You've been logging consistently — great job! ${recentLogs.length} entries this week`,
      color: '#34D399',
      category: 'positive',
    })
  }

  // ----- Energy first-half-of-week pattern -----
  if (recentLogs.length >= 4) {
    const logsWithDayOfWeek = recentLogs.map((l) => ({
      ...l,
      dayOfWeek: parseISO(l.date).getDay(),
    }))
    const firstHalf = logsWithDayOfWeek.filter((l) => l.dayOfWeek >= 1 && l.dayOfWeek <= 3) // Mon-Wed
    const secondHalf = logsWithDayOfWeek.filter((l) => l.dayOfWeek >= 4 && l.dayOfWeek <= 5) // Thu-Fri

    if (firstHalf.length >= 2 && secondHalf.length >= 1) {
      const firstAvg = firstHalf.reduce((sum, l) => sum + l.energy, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, l) => sum + l.energy, 0) / secondHalf.length
      if (firstAvg > secondAvg + 1) {
        insights.push({
          id: 'energy-firsthalf',
          text: 'Your energy levels are highest in the first half of the week',
          color: '#F9A8D4',
          category: 'energy',
        })
      }
    }
  }

  // ----- Hydration insight -----
  const logsWater = recentLogs.filter((l) => l.waterIntake > 0)
  if (logsWater.length >= 2) {
    const avgWater = Math.round(
      logsWater.reduce((sum, l) => sum + l.waterIntake, 0) / logsWater.length
    )
    if (avgWater < 6) {
      insights.push({
        id: 'hydration-low',
        text: `Consider adding more water intake — you're averaging ${avgWater} glasses`,
        color: '#E8788A',
        category: 'hydration',
      })
    }
  }

  // ----- Stress pattern -----
  if (recentLogs.length >= 3) {
    const stressValues = recentLogs.slice(0, 3).map((l) => l.stress)
    const avgStress = stressValues.reduce((a, b) => a + b, 0) / stressValues.length
    if (avgStress >= 7) {
      insights.push({
        id: 'stress-high',
        text: 'Your stress levels have been elevated — try a breathing exercise or short walk',
        color: '#E8788A',
        category: 'mood',
      })
    }
  }

  // ----- Sleep average insight -----
  if (recentLogs.length >= 3) {
    const avgSleep = recentLogs.reduce((sum, l) => sum + l.sleep, 0) / recentLogs.length
    if (avgSleep >= 7) {
      insights.push({
        id: 'sleep-good',
        text: `Your average sleep quality is ${avgSleep.toFixed(1)}/10 — keep it up!`,
        color: '#34D399',
        category: 'positive',
      })
    } else if (avgSleep <= 4) {
      insights.push({
        id: 'sleep-low',
        text: `Your average sleep quality is ${avgSleep.toFixed(1)}/10 — try a calming bedtime routine`,
        color: '#C084FC',
        category: 'sleep',
      })
    }
  }

  // Return top 4 most relevant insights, prioritizing variety
  const seen = new Set<string>()
  const unique: HealthInsight[] = []
  for (const insight of insights) {
    if (!seen.has(insight.category)) {
      seen.add(insight.category)
      unique.push(insight)
    }
  }
  // Fill remaining with any extras
  for (const insight of insights) {
    if (unique.length >= 4) break
    if (!unique.find((u) => u.id === insight.id)) {
      unique.push(insight)
    }
  }

  return unique.slice(0, 4)
}

// ---------------------------------------------------------------------------
// Sparkline mini chart component
// ---------------------------------------------------------------------------

function MiniSparkline({
  data,
  color = '#E8788A',
  width = 80,
  height = 32,
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
}) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2

  const points = data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2)
      const y = height - padding - ((val - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.length > 0 && (
        <circle
          cx={padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2)}
          cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
          r={3}
          fill={color}
          stroke="white"
          strokeWidth={1.5}
        />
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------

function CustomChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white/95 dark:bg-[#2A1520]/95 backdrop-blur-md border border-[#F9D0DA] dark:border-[#4A2535] rounded-xl px-4 py-3 shadow-lg shadow-[#E8788A]/5">
      <p className="text-xs font-medium text-[#9B6B7B] dark:text-[#A07888] mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#6B3A4A] dark:text-[#C9A0B0] capitalize">{entry.name}:</span>
          <span className="font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{entry.value}</span>
        </div>
      ))}
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
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`overflow-hidden rounded-2xl border border-[#F9D0DA]/70 bg-white shadow-sm shadow-[#E8788A]/5 dark:border-[#4A2535]/70 dark:bg-[#2A1520] ${className}`}
    >
      <div className={`h-1 bg-gradient-to-r ${gradient}`} />
      {children}
    </motion.div>
  )
}

function CalmCard({
  children,
  className = '',
  animateIndex = 0,
}: {
  children: React.ReactNode
  className?: string
  animateIndex?: number
}) {
  return (
    <motion.div
      custom={animateIndex}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`rounded-2xl border border-[#F9D0DA]/70 bg-white shadow-sm shadow-[#E8788A]/5 dark:border-[#4A2535]/70 dark:bg-[#2A1520] ${className}`}
    >
      {children}
    </motion.div>
  )
}

function DashboardSectionTabs({
  activeSection,
  onChange,
}: {
  activeSection: DashboardSection
  onChange: (section: DashboardSection) => void
}) {
  return (
    <div className="flex w-full max-w-full gap-2 overflow-hidden rounded-2xl border border-[#F9D0DA]/70 bg-white p-1.5 shadow-sm dark:border-[#4A2535]/70 dark:bg-[#2A1520]"
      style={{ maxWidth: 'calc(100vw - 2rem)' }}>
      {dashboardSections.map((section) => {
        const Icon = section.icon
        const active = activeSection === section.id

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${
              active
                ? 'bg-[#FFF0F3] text-[#E8788A] dark:bg-[#3A2030] dark:text-[#F9D0DA]'
                : 'text-[#8F5366] hover:bg-[#FFF7F9] dark:text-[#A07888] dark:hover:bg-[#3A2030]/60'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden max-w-full truncate leading-tight sm:inline">{section.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function DashboardCustomizePanel({
  density,
  visibleWidgets,
  onDensityChange,
  onToggleWidget,
}: {
  density: DashboardDensity
  visibleWidgets: DashboardWidgetId[]
  onDensityChange: (density: DashboardDensity) => void
  onToggleWidget: (widget: DashboardWidgetId) => void
}) {
  return (
    <details className="group rounded-2xl border border-[#F9D0DA]/70 bg-white shadow-sm dark:border-[#4A2535]/70 dark:bg-[#2A1520]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
          <SlidersHorizontal className="h-4 w-4 text-[#E8788A]" />
          <span>Customize Home</span>
        </div>
        <span className="text-xs font-medium text-[#9B6B7B] transition-transform group-open:rotate-180 dark:text-[#A07888]">v</span>
      </summary>

      <div className="border-t border-[#F9D0DA]/60 px-4 pb-4 pt-3 dark:border-[#4A2535]/70">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['comfortable', 'compact'] as DashboardDensity[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onDensityChange(item)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                density === item
                  ? 'border-[#E8788A]/30 bg-[#FFF0F3] text-[#E8788A] dark:border-[#F0869A]/30 dark:bg-[#3A2030] dark:text-[#F9D0DA]'
                  : 'border-[#F9D0DA] text-[#8F5366] hover:bg-[#FFF7F9] dark:border-[#4A2535] dark:text-[#A07888] dark:hover:bg-[#3A2030]/60'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {dashboardWidgetOptions.map((widget) => {
            const visible = visibleWidgets.includes(widget.id)
            return (
              <button
                key={widget.id}
                type="button"
                onClick={() => onToggleWidget(widget.id)}
                aria-pressed={visible}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  visible
                    ? 'border-[#E8788A]/25 bg-[#FFF7F9] text-[#4A1D2E] dark:border-[#F0869A]/25 dark:bg-[#3A2030] dark:text-[#F9D0DA]'
                    : 'border-[#F9D0DA]/70 text-[#9B6B7B] opacity-70 hover:opacity-100 dark:border-[#4A2535] dark:text-[#A07888]'
                }`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${visible ? 'border-[#E8788A] bg-[#E8788A] text-white' : 'border-[#F9D0DA] dark:border-[#4A2535]'}`}>
                  {visible && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{widget.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </details>
  )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">{title}</h2>
      <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">{description}</p>
    </div>
  )
}

function EmptySection() {
  return (
    <CalmCard className="px-6 py-8 text-center">
      <p className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">No widgets selected</p>
      <p className="mt-1 text-xs text-[#9B6B7B] dark:text-[#A07888]">Use Customize Dashboard to bring a widget back.</p>
    </CalmCard>
  )
}

function MetricTile({
  icon: Icon,
  label,
  value,
  color,
  data,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  data: number[]
}) {
  return (
    <div className="rounded-xl bg-[#FFF7F9] p-3.5 text-center dark:bg-[#3A2030]/50">
      <Icon className="mx-auto mb-1.5 h-4 w-4" style={{ color }} />
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[10px] text-[#9B6B7B] dark:text-[#A07888]">{label}</p>
      <div className="mt-2 flex justify-center">
        <MiniSparkline data={data} color={color} width={70} height={28} />
      </div>
    </div>
  )
}

function CyclePredictionCard({
  prediction,
  onEditCycle,
}: {
  prediction: CyclePrediction
  onEditCycle: () => void
}) {
  const hasDate = prediction.daysUntilNext !== null

  return (
    <CalmCard animateIndex={1}>
      <div className="px-4 py-4 sm:px-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F3FF] dark:bg-[#3A2030]">
              <Brain className="h-5 w-5 text-[#C084FC]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Cycle Prediction</h2>
              <p className="text-xs leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">
                Uses FedCycle reference data plus your NariAid tracker logs.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-[#FFF0F3] px-3 py-1 text-xs font-semibold text-[#E8788A] dark:bg-[#3A2030] dark:text-[#F9D0DA]">
            {prediction.confidence}% confidence
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9B6B7B] dark:text-[#A07888]">Next period</p>
            <p className="mt-1 text-xl font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">{prediction.predictedNextPeriodLabel}</p>
            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
              {hasDate ? `${prediction.daysUntilNext} days away` : 'Profile needed'}
            </p>
          </div>
          <div className="rounded-xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9B6B7B] dark:text-[#A07888]">Fertile window</p>
            <p className="mt-1 text-xl font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">{prediction.fertileWindowLabel ?? 'Add cycle date'}</p>
            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Ovulation {prediction.ovulationLabel ?? 'pending'}</p>
          </div>
          <div className="rounded-xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9B6B7B] dark:text-[#A07888]">Current phase</p>
            <p className="mt-1 text-xl font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">{prediction.currentPhase}</p>
            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{prediction.modelCycleLength}-day model</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-[#8F5366] dark:text-[#A07888]">
            {prediction.reasoning.slice(0, 2).join(' · ')}
          </p>
          {!hasDate && (
            <button
              type="button"
              onClick={onEditCycle}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#E8788A] px-4 py-2 text-xs font-semibold text-white"
            >
              Add cycle date
            </button>
          )}
        </div>
      </div>
    </CalmCard>
  )
}

function HealthGuidanceCard({ assessment }: { assessment: CycleRiskAssessment }) {
  const statusStyles = {
    steady: 'bg-[#EFFAF6] text-[#2F7D62] dark:bg-[#19382E] dark:text-[#A7F3D0]',
    watch: 'bg-[#FFF7E8] text-[#A66A00] dark:bg-[#3B2A13] dark:text-[#FCD34D]',
    doctor: 'bg-[#FFF0F3] text-[#C94F68] dark:bg-[#3A2030] dark:text-[#F9D0DA]',
    urgent: 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#451A1A] dark:text-[#FCA5A5]',
  } as const

  const topComparison = assessment.comparison.slice(0, 2)

  return (
    <CalmCard animateIndex={2}>
      <div className="px-4 py-4 sm:px-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFFAF6] dark:bg-[#19382E]">
              <ShieldCheck className="h-5 w-5 text-[#2F7D62] dark:text-[#A7F3D0]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Health Guidance</h2>
              <p className="text-xs leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">
                Compares your tracker with FedCycle reference patterns.
              </p>
            </div>
          </div>
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[assessment.status]}`}>
            {assessment.title}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-[#4A1D2E] dark:text-[#F9D0DA]">{assessment.summary}</p>

        <div className="mt-4 space-y-2">
          {topComparison.map((item) => (
            <div key={item.label} className="rounded-xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/50">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-[#8F5366] dark:text-[#A07888]">{item.label}</p>
                <Badge className="rounded-md border-0 bg-white px-2 py-0.5 text-[10px] font-semibold text-[#8F5366] dark:bg-[#2A1520] dark:text-[#A07888]">
                  {item.status === 'steady' ? 'In range' : item.status === 'watch' ? 'Watch' : 'Check'}
                </Badge>
              </div>
              <p className="mt-1 text-sm font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">{item.userValue}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">{item.referenceValue}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-[#F9D0DA]/70 bg-white/70 p-3 dark:border-[#4A2535] dark:bg-[#2A1520]/70">
          <p className="text-xs font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Care note</p>
          <p className="mt-1 text-xs leading-relaxed text-[#8F5366] dark:text-[#A07888]">{assessment.doctorPrompts[0]}</p>
        </div>
      </div>
    </CalmCard>
  )
}

function DailyCheckInCard({
  mood,
  energy,
  sleep,
  saving,
  saved,
  compact,
  prominent = false,
  onMoodChange,
  onEnergyChange,
  onSleepChange,
  onSave,
}: {
  mood: number
  energy: number
  sleep: number
  saving: boolean
  saved: boolean
  compact: boolean
  prominent?: boolean
  onMoodChange: (value: number) => void
  onEnergyChange: (value: number) => void
  onSleepChange: (value: number) => void
  onSave: () => void
}) {
  return (
    <GradientBorderCard animateIndex={1} gradient="from-[#E8788A] via-[#F9A8D4] to-[#FDA4AF]">
      <div className={compact ? 'px-4 py-4' : 'px-6 py-5'}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030]">
              <Heart className="h-4 w-4 text-[#E8788A]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
                {prominent ? 'Start with today\'s check-in' : 'Daily Check-in'}
              </h2>
              <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Mood, energy, and sleep</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-sm font-semibold text-[#2F7D62]"
              >
                Saved
              </motion.div>
            ) : (
              <Button
                key="save-btn"
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="h-auto rounded-full border-0 bg-[#E8788A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D66A7C]"
              >
                {saving ? 'Saving...' : 'Save check-in'}
              </Button>
            )}
          </AnimatePresence>
        </div>

        <div className={compact ? 'space-y-3' : 'space-y-4'}>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sun className="h-3.5 w-3.5 text-[#E8788A]" />
                <span className="text-sm font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Mood</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-[#9B6B7B] dark:text-[#A07888] sm:inline">{getMoodLabel(mood)}</span>
                <span className="w-6 text-right text-lg font-bold text-[#E8788A]">{mood}</span>
              </div>
            </div>
            <Slider
              value={[mood]}
              min={1}
              max={10}
              step={1}
              onValueChange={(value) => onMoodChange(value[0])}
              className="w-full [&_[data-slot=slider-range]]:bg-[#E8788A] [&_[data-slot=slider-thumb]]:border-[#E8788A] [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-[#F9D0DA]/70"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-[#C084FC]" />
                <span className="text-sm font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Energy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-[#9B6B7B] dark:text-[#A07888] sm:inline">{getEnergyLabel(energy)}</span>
                <span className="w-6 text-right text-lg font-bold text-[#C084FC]">{energy}</span>
              </div>
            </div>
            <Slider
              value={[energy]}
              min={1}
              max={10}
              step={1}
              onValueChange={(value) => onEnergyChange(value[0])}
              className="w-full [&_[data-slot=slider-range]]:bg-[#C084FC] [&_[data-slot=slider-thumb]]:border-[#C084FC] [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-[#F9D0DA]/70"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Moon className="h-3.5 w-3.5 text-[#60A5FA]" />
                <span className="text-sm font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Sleep</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-[#9B6B7B] dark:text-[#A07888] sm:inline">{getSleepLabel(sleep)}</span>
                <span className="w-6 text-right text-lg font-bold text-[#60A5FA]">{sleep}</span>
              </div>
            </div>
            <Slider
              value={[sleep]}
              min={1}
              max={10}
              step={1}
              onValueChange={(value) => onSleepChange(value[0])}
              className="w-full [&_[data-slot=slider-range]]:bg-[#60A5FA] [&_[data-slot=slider-thumb]]:border-[#60A5FA] [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-[#F9D0DA]/70"
            />
          </div>
        </div>
      </div>
    </GradientBorderCard>
  )
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const {
    userName,
    setActiveTab,
    toggleAIChat,
    dashboardDensity,
    visibleDashboardWidgets,
    toggleDashboardWidget,
    setDashboardDensity,
    activeDashboardSection,
    setActiveDashboardSection,
  } = useAppStore()

  // ---- State ----
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [backendRiskAssessment, setBackendRiskAssessment] = useState<CycleRiskAssessment | null>(null)
  const [loading, setLoading] = useState(true)

  // Daily check-in state
  const [mood, setMood] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [sleep, setSleep] = useState(5)
  const [checkInSaving, setCheckInSaving] = useState(false)
  const [checkInSaved, setCheckInSaved] = useState(false)

  // ---- Fetch all data ----
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, logsRes, remindersRes] = await Promise.all([
        fetch('/api/profile', { cache: 'no-store' }),
        fetch('/api/health-logs', { cache: 'no-store' }),
        fetch('/api/reminders', { cache: 'no-store' }),
      ])

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData)
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setHealthLogs(logsData)

        // Pre-fill today's check-in if log exists for today
        const today = format(new Date(), 'yyyy-MM-dd')
        const todayLog = logsData.find((log: HealthLog) => log.date === today)
        if (todayLog) {
          setMood(todayLog.mood)
          setEnergy(todayLog.energy)
          setSleep(todayLog.sleep)
        }
      }

      if (remindersRes.ok) {
        const remindersData = await remindersRes.json()
        setReminders(remindersData)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (loading) return
    let cancelled = false

    fetch('/api/risk-assessment', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Risk endpoint returned an error')
        const data = await response.json() as { assessment: CycleRiskAssessment }
        if (!cancelled) setBackendRiskAssessment(data.assessment)
      })
      .catch((error) => console.error('Failed to fetch backend risk assessment:', error))

    return () => {
      cancelled = true
    }
  }, [healthLogs, profile, loading])

  // ---- Submit daily check-in ----
  const submitCheckIn = useCallback(async () => {
    setCheckInSaving(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingLog = healthLogs.find((log) => log.date === today)
      const isFirstHealthLog = healthLogs.length === 0

      const payload = {
        ...(existingLog ? { id: existingLog.id } : {}),
        date: today,
        mood,
        energy,
        sleep,
        stress: existingLog?.stress ?? 5,
        pain: existingLog?.pain ?? 0,
        symptoms: existingLog?.symptoms ?? '',
        notes: existingLog?.notes ?? '',
        waterIntake: existingLog?.waterIntake ?? 0,
      }

      const res = await fetch('/api/health-logs', {
        method: existingLog ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setCheckInSaved(true)
        setTimeout(() => setCheckInSaved(false), 2500)
        // Refresh data
        const logsRes = await fetch('/api/health-logs', { cache: 'no-store' })
        if (logsRes.ok) {
          setHealthLogs(await logsRes.json())
        }
        if (isFirstHealthLog) setActiveTab('progress')
      }
    } catch (err) {
      console.error('Failed to submit check-in:', err)
    } finally {
      setCheckInSaving(false)
    }
  }, [mood, energy, sleep, healthLogs, setActiveTab])

  // ---- Derived data ----
  const cycleInfo = getCycleInfo(
    profile?.cycleLength ?? 28,
    profile?.lastPeriodStart ?? ''
  )

  const displayName = profile?.name || userName || 'there'

  // Latest log
  const latestLog = healthLogs.length > 0 ? healthLogs[0] : null

  // Last 7 days for chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(new Date(), -6 + i), 'yyyy-MM-dd')
    const dayLabel = format(addDays(new Date(), -6 + i), 'EEE')
    const log = healthLogs.find((l) => l.date === date)
    return {
      day: dayLabel,
      date,
      mood: log?.mood ?? null,
      energy: log?.energy ?? null,
    }
  })

  // Sparkline data for summary
  const moodSparkData = healthLogs.slice(0, 7).reverse().map((l) => l.mood)
  const energySparkData = healthLogs.slice(0, 7).reverse().map((l) => l.energy)
  const sleepSparkData = healthLogs.slice(0, 7).reverse().map((l) => l.sleep)

  // Active reminders (next 3)
  const activeReminders = reminders
    .filter((r) => r.active)
    .slice(0, 3)

  // Cycle phase progress (0-100)
  const cycleProgress = Math.round(
    ((cycleInfo.cycleDay - 1) / (profile?.cycleLength ?? 28)) * 100
  )

  // Current date formatted
  const currentDate = format(new Date(), 'EEEE, MMMM d')
  const todayDate = format(new Date(), 'yyyy-MM-dd')
  const hasTodayCheckIn = healthLogs.some((log) => log.date === todayDate)

  const insights = useMemo(() => generateHealthInsights(healthLogs), [healthLogs])
  const cyclePrediction = useMemo(() => getCyclePrediction({ profile, healthLogs }), [profile, healthLogs])
  const localRiskAssessment = useMemo(() => getCycleRiskAssessment({ profile, healthLogs, prediction: cyclePrediction }), [profile, healthLogs, cyclePrediction])
  const cycleRiskAssessment = backendRiskAssessment ?? localRiskAssessment
  const isCompact = dashboardDensity === 'compact'
  const cardPadding = isCompact ? 'px-4 py-4' : 'px-6 py-5'
  const sectionGap = isCompact ? 'space-y-3' : 'space-y-4'
  const widgetVisible = useCallback(
    (widget: DashboardWidgetId) => visibleDashboardWidgets.includes(widget),
    [visibleDashboardWidgets]
  )
  const hasVisibleWidgets = useCallback(
    (section: DashboardSection) => dashboardWidgetOptions.some((widget) => widget.section === section && visibleDashboardWidgets.includes(widget.id)),
    [visibleDashboardWidgets]
  )

  // Reminder icon by category
  const getReminderIcon = (category: string) => {
    switch (category) {
      case 'health':
        return Heart
      case 'medication':
        return Droplets
      case 'wellness':
        return Sparkles
      default:
        return Bell
    }
  }

  const getReminderColor = (category: string) => {
    switch (category) {
      case 'health':
        return '#E8788A'
      case 'medication':
        return '#C084FC'
      case 'wellness':
        return '#F9A8D4'
      default:
        return '#FDA4AF'
    }
  }

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0D12] px-4 py-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white/60 dark:bg-[#2A1520]/60 rounded-2xl p-6 animate-pulse"
            >
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
      className="min-h-screen overflow-x-hidden bg-[#FFF8FA] dark:bg-[#1A0D12]"
    >
      <div className={`relative z-10 mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-5 pb-24 ${sectionGap}`}>
        {!hasTodayCheckIn && (
          <section aria-labelledby="daily-check-in-reminder" className={sectionGap}>
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-[#E8788A]/30 bg-[#FFF0F3] px-4 py-3 text-[#4A1D2E] shadow-sm dark:border-[#F0869A]/30 dark:bg-[#3A2030] dark:text-[#F9D0DA]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8788A] text-white">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p id="daily-check-in-reminder" className="text-sm font-bold">Your daily check-in is ready</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#8F5366] dark:text-[#C9A0B0]">
                  This is your first visit today. Log mood, energy, and sleep now to keep Trends current.
                </p>
              </div>
            </div>

            <DailyCheckInCard
              mood={mood}
              energy={energy}
              sleep={sleep}
              saving={checkInSaving}
              saved={checkInSaved}
              compact={isCompact}
              prominent
              onMoodChange={setMood}
              onEnergyChange={setEnergy}
              onSleepChange={setSleep}
              onSave={submitCheckIn}
            />
          </section>
        )}

        <CalmCard animateIndex={0} className={`${cardPadding} overflow-hidden`}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] lg:items-center">
            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium text-[#9B6B7B] dark:text-[#A07888]">{currentDate}</p>
              <h1 className="text-2xl font-bold text-[#4A1D2E] dark:text-[#F9D0DA] sm:text-3xl">
                Hello, <span className="text-[#E8788A]">{displayName}</span>
              </h1>
              <p className="mt-2 text-sm text-[#8F5366] dark:text-[#A07888]">
                {cycleInfo.phase !== 'Unknown'
                  ? `Day ${cycleInfo.cycleDay} of your cycle - ${cycleInfo.phase} phase`
                  : 'Set up your cycle in Profile to get personalized insights'}
              </p>
            </div>

            <div className="rounded-2xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/55">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#E8788A] shadow-sm dark:bg-[#2A1520]">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Ask Nari</p>
                  <p className="text-xs leading-relaxed text-[#8F5366] dark:text-[#A07888]">Get quick help choosing what to log or what your pattern may mean.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleAIChat}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#E8788A] shadow-sm transition-transform active:scale-95 dark:bg-[#2A1520] dark:text-[#F9D0DA]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Ask Nari
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('health-log')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E8788A] px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-[#E8788A]/20 transition-transform active:scale-95"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Track now
                </button>
              </div>
            </div>
          </div>
        </CalmCard>

        <DashboardSectionTabs activeSection={activeDashboardSection} onChange={setActiveDashboardSection} />

        {!hasVisibleWidgets(activeDashboardSection) && <EmptySection />}

        {activeDashboardSection === 'today' && hasVisibleWidgets('today') && (
          <section className={sectionGap}>
            <SectionHeading title="Today" description="Start here: ask for guidance, check in, or see what is coming next." />

            <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
              {widgetVisible('period-countdown') && <CyclePredictionCard prediction={cyclePrediction} onEditCycle={() => setActiveTab('profile')} />}
              {widgetVisible('health-guidance') && <HealthGuidanceCard assessment={cycleRiskAssessment} />}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-start">
              <div className={sectionGap}>
                {widgetVisible('check-in') && hasTodayCheckIn && (
                  <DailyCheckInCard
                    mood={mood}
                    energy={energy}
                    sleep={sleep}
                    saving={checkInSaving}
                    saved={checkInSaved}
                    compact={isCompact}
                    onMoodChange={setMood}
                    onEnergyChange={setEnergy}
                    onSleepChange={setSleep}
                    onSave={submitCheckIn}
                  />
                )}

                {widgetVisible('daily-tip') && <DailyHealthTip phase={cycleInfo.phase} phaseColor={cycleInfo.phaseColor} />}
              </div>

              <aside className={sectionGap}>
                {widgetVisible('health-score') && <HealthScoreWidget healthLogs={healthLogs} assessment={cycleRiskAssessment} />}

                {widgetVisible('period-countdown') && <PeriodCountdown profile={profile} cycleInfo={cycleInfo} />}

                {widgetVisible('reminders') && (
                  <CalmCard animateIndex={4}>
                    <div className={cardPadding}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030]">
                            <Bell className="h-4 w-4 text-[#E8788A]" />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Upcoming Reminders</h2>
                            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Next active items</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('reminders')}
                          className="flex items-center gap-0.5 text-xs font-semibold text-[#E8788A]"
                        >
                          View
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>

                      {activeReminders.length > 0 ? (
                        <div className="space-y-2.5">
                          {activeReminders.map((reminder) => {
                            const Icon = getReminderIcon(reminder.category)
                            const color = getReminderColor(reminder.category)
                            return (
                              <div key={reminder.id} className="flex items-center gap-3 rounded-xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/50">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
                                  <Icon className="h-4 w-4" style={{ color }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">{reminder.title}</p>
                                  <div className="mt-0.5 flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-[#9B6B7B] dark:text-[#A07888]" />
                                    <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{reminder.time}</span>
                                    {reminder.frequency && (
                                      <Badge variant="secondary" className="rounded-md border-0 bg-white px-1.5 py-0 text-[9px] capitalize text-[#9B6B7B] dark:bg-[#2A1520] dark:text-[#A07888]">
                                        {reminder.frequency}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl bg-[#FFF7F9] px-4 py-5 text-center dark:bg-[#3A2030]/50">
                          <p className="text-sm font-medium text-[#9B6B7B] dark:text-[#A07888]">No active reminders</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTab('reminders')}
                            className="mt-3 h-auto rounded-full border-[#F9D0DA] px-4 py-1.5 text-xs text-[#E8788A] hover:bg-white dark:border-[#4A2535] dark:bg-[#2A1520]"
                          >
                            Create Reminder
                          </Button>
                        </div>
                      )}
                    </div>
                  </CalmCard>
                )}
              </aside>
            </div>

            {widgetVisible('today-summary') && (
              <CalmCard animateIndex={2}>
                <div className={cardPadding}>
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030]">
                      <Activity className="h-4 w-4 text-[#E8788A]" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Today Summary</h2>
                      <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Latest logged signals</p>
                    </div>
                  </div>

                  {latestLog ? (
                    <div className="grid grid-cols-3 gap-3">
                      <MetricTile icon={Sun} label="Mood" value={latestLog.mood} color="#E8788A" data={moodSparkData} />
                      <MetricTile icon={Zap} label="Energy" value={latestLog.energy} color="#C084FC" data={energySparkData} />
                      <MetricTile icon={Moon} label="Sleep" value={latestLog.sleep} color="#60A5FA" data={sleepSparkData} />
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[#FFF7F9] px-4 py-6 text-center dark:bg-[#3A2030]/50">
                      <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">Complete your first check-in to see your metrics</p>
                    </div>
                  )}
                </div>
              </CalmCard>
            )}
          </section>
        )}

        {activeDashboardSection === 'insights' && hasVisibleWidgets('insights') && (
          <section className={sectionGap}>
            <SectionHeading title="Trends" description="Patterns over time, kept separate from daily tracking." />

            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <div className={sectionGap}>
                {widgetVisible('ai-insights') && insights.length > 0 && (
                  <CalmCard animateIndex={1}>
                    <div className={cardPadding}>
                      <div className="mb-4 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F3FF] dark:bg-[#3A2030]">
                          <Brain className="h-4 w-4 text-[#C084FC]" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Smart Suggestions</h2>
                          <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Recent patterns</p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {insights.map((insight) => (
                          <div key={insight.id} className="flex items-start gap-3 rounded-xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/50">
                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: insight.color }} />
                            <p className="text-sm leading-relaxed text-[#4A1D2E] dark:text-[#F9D0DA]">{insight.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CalmCard>
                )}

                {widgetVisible('weekly-trends') && (
                  <GradientBorderCard animateIndex={2} gradient="from-[#F9A8D4] via-[#FDA4AF] to-[#E8788A]">
                    <div className={cardPadding}>
                      <div className="mb-5 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030]">
                          <TrendingUp className="h-4 w-4 text-[#E8788A]" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Weekly Patterns</h2>
                          <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Mood and energy</p>
                        </div>
                      </div>

                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={last7Days} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#E8788A" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#E8788A" stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#C084FC" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#C084FC" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F9D0DA" strokeOpacity={0.4} vertical={false} />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9B6B7B' }} dy={8} />
                            <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9B6B7B' }} ticks={[0, 5, 10]} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Area type="monotone" dataKey="mood" stroke="#E8788A" strokeWidth={2.5} fill="url(#moodGradient)" dot={{ r: 3, fill: '#E8788A', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#E8788A', stroke: '#fff', strokeWidth: 2 }} connectNulls={false} />
                            <Area type="monotone" dataKey="energy" stroke="#C084FC" strokeWidth={2.5} fill="url(#energyGradient)" dot={{ r: 3, fill: '#C084FC', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#C084FC', stroke: '#fff', strokeWidth: 2 }} connectNulls={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {last7Days.every((d) => d.mood === null && d.energy === null) && (
                        <p className="mt-3 text-center text-xs text-[#9B6B7B] dark:text-[#A07888]">Start logging to see your weekly trends</p>
                      )}
                    </div>
                  </GradientBorderCard>
                )}

                {widgetVisible('mood-heatmap') && healthLogs.length > 0 && <MoodHeatmap healthLogs={healthLogs} />}
                {widgetVisible('journal') && <HealthJournal healthLogs={healthLogs} />}
              </div>

              <div className={sectionGap}>
                {widgetVisible('cycle-overview') && (
                  <CalmCard animateIndex={3}>
                    <div className={cardPadding}>
                      <div className="mb-5 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F3FF] dark:bg-[#3A2030]">
                          <Droplets className="h-4 w-4 text-[#C084FC]" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Cycle Status</h2>
                          <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Current phase and timing</p>
                        </div>
                      </div>

                      {cycleInfo.phase !== 'Unknown' ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="mb-1 text-xs text-[#9B6B7B] dark:text-[#A07888]">Current Phase</p>
                              <Badge className="rounded-lg border-0 px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${cycleInfo.phaseColor}18`, color: cycleInfo.phaseColor }}>
                                {cycleInfo.phase}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="mb-1 text-xs text-[#9B6B7B] dark:text-[#A07888]">Cycle Day</p>
                              <p className="text-3xl font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">{cycleInfo.cycleDay}</p>
                            </div>
                          </div>

                          <div>
                            <div className="mb-1.5 flex items-center justify-between text-xs text-[#9B6B7B] dark:text-[#A07888]">
                              <span>Progress through cycle</span>
                              <span>{cycleProgress}%</span>
                            </div>
                            <Progress value={cycleProgress} className="h-2.5 bg-[#FFF0F3] dark:bg-[#3A2030] [&_[data-slot=progress-indicator]]:bg-[#E8788A]" />
                          </div>

                          <div className="flex items-center justify-between rounded-xl bg-[#FFF7F9] p-3.5 dark:bg-[#3A2030]/50">
                            <div className="flex items-center gap-2.5">
                              <CalendarDays className="h-4 w-4 text-[#C084FC]" />
                              <div>
                                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Next Period</p>
                                <p className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{cycleInfo.nextPeriod}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-[#E8788A]">{cycleInfo.daysUntilNext}</p>
                              <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">days away</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-[#FFF7F9] px-4 py-6 text-center dark:bg-[#3A2030]/50">
                          <p className="mb-3 text-sm text-[#9B6B7B] dark:text-[#A07888]">Cycle data not available</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTab('profile')}
                            className="h-auto rounded-full border-[#F9D0DA] px-4 py-1.5 text-xs text-[#E8788A] dark:border-[#4A2535] dark:bg-[#2A1520]"
                          >
                            Set Up in Profile
                          </Button>
                        </div>
                      )}
                    </div>
                  </CalmCard>
                )}

                {widgetVisible('recommendations') && cycleInfo.phase !== 'Unknown' && (
                  <CycleRecommendations
                    cycleDay={cycleInfo.cycleDay}
                    cycleLength={profile?.cycleLength ?? 28}
                    phaseName={cycleInfo.phase}
                  />
                )}

                {widgetVisible('phase-note') && (
                  <CalmCard animateIndex={4} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030]">
                        <AlertCircle className="h-4 w-4 text-[#E8788A]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-relaxed text-[#4A1D2E] dark:text-[#F9D0DA]">
                          {cycleInfo.phase === 'Menstrual'
                            ? 'Rest and nurture yourself during your menstrual phase. Gentle movement and warm foods can help.'
                            : cycleInfo.phase === 'Follicular'
                            ? 'Your energy is rising. This is a good time for planning and social activities.'
                            : cycleInfo.phase === 'Ovulation'
                            ? 'Peak energy and creativity. You may feel more social and confident during ovulation.'
                            : cycleInfo.phase === 'Luteal'
                            ? 'Slow down and prioritize self-care. PMS symptoms may appear; be gentle with yourself.'
                            : 'Track your cycle to receive personalized insights about each phase.'}
                        </p>
                        <p className="mt-1 text-xs text-[#9B6B7B] dark:text-[#A07888]">
                          {cycleInfo.phase !== 'Unknown' ? `Based on your ${cycleInfo.phase.toLowerCase()} phase` : 'Complete your profile for personalized tips'}
                        </p>
                      </div>
                    </div>
                  </CalmCard>
                )}
              </div>
            </div>
          </section>
        )}

        {activeDashboardSection === 'tools' && hasVisibleWidgets('tools') && (
          <section className={sectionGap}>
            <SectionHeading title="Trackers" description="Detailed logging tools live here when you need them." />

            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <div className={sectionGap}>
                {widgetVisible('hydration') && <HydrationTracker latestLog={latestLog} />}
                {widgetVisible('medication') && <MedicationTracker />}
                {widgetVisible('symptoms') && <SymptomQuickLog latestLog={latestLog} />}
              </div>
              <div className={sectionGap}>
                {widgetVisible('sleep') && <SleepAnalysis phase={cycleInfo.phase} />}
                {widgetVisible('nutrition') && <NutritionTracker phase={cycleInfo.phase} />}
                {widgetVisible('quick-actions') && (
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('health-log')}
                      className="flex flex-col items-center gap-2.5 rounded-2xl border border-[#F9D0DA]/70 bg-white p-4 text-center shadow-sm dark:border-[#4A2535]/70 dark:bg-[#2A1520]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030]">
                        <ClipboardList className="h-5 w-5 text-[#E8788A]" />
                      </div>
                      <span className="text-xs font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">Log Symptoms</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('reminders')}
                      className="flex flex-col items-center gap-2.5 rounded-2xl border border-[#F9D0DA]/70 bg-white p-4 text-center shadow-sm dark:border-[#4A2535]/70 dark:bg-[#2A1520]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F3FF] dark:bg-[#3A2030]">
                        <Bell className="h-5 w-5 text-[#C084FC]" />
                      </div>
                      <span className="text-xs font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">Set Reminder</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('calendar')}
                      className="flex flex-col items-center gap-2.5 rounded-2xl border border-[#F9D0DA]/70 bg-white p-4 text-center shadow-sm dark:border-[#4A2535]/70 dark:bg-[#2A1520]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF7F9] dark:bg-[#3A2030]">
                        <CalendarDays className="h-5 w-5 text-[#E8788A]" />
                      </div>
                      <span className="text-xs font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">Calendar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <DashboardCustomizePanel
          density={dashboardDensity}
          visibleWidgets={visibleDashboardWidgets}
          onDensityChange={setDashboardDensity}
          onToggleWidget={toggleDashboardWidget}
        />
      </div>
    </motion.div>
  )
}
