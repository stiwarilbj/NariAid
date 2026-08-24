'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, addDays, parseISO, isValid } from 'date-fns'
import { Moon, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SleepAnalysisProps {
  phase: string
}

interface HealthLog {
  id: string
  date: string
  sleep: number
}

interface SleepTip {
  title: string
  description: string
}

// ---------------------------------------------------------------------------
// Phase-based sleep tips configuration
// ---------------------------------------------------------------------------

const phaseSleepTips: Record<string, SleepTip> = {
  Menstrual: {
    title: 'Prioritize Deep Rest',
    description:
      'Your body needs extra recovery during this phase. Aim for 8+ hours of sleep and consider a warm bath before bed to ease cramps and promote deeper rest.',
  },
  Follicular: {
    title: 'Capitalize on Rising Energy',
    description:
      'With improving energy, maintain a consistent sleep schedule. Morning sunlight exposure can help regulate your circadian rhythm for better nighttime sleep.',
  },
  Ovulation: {
    title: 'Optimize Peak Recovery',
    description:
      'Your body temperature rises slightly around ovulation. Keep your bedroom cool and use breathable bedding to maintain sleep quality during this phase.',
  },
  Luteal: {
    title: 'Wind Down Gently',
    description:
      'Progesterone rises can cause sleep disturbances. Try a calming bedtime routine with magnesium-rich snacks and limit screen time an hour before bed.',
  },
}

const defaultTip: SleepTip = {
  title: 'Build a Sleep Routine',
  description:
    'Consistent sleep and wake times help regulate your internal clock. Set up your cycle in Profile for phase-specific sleep guidance.',
}

// ---------------------------------------------------------------------------
// Sleep quality categories
// ---------------------------------------------------------------------------

interface QualitySegment {
  label: string
  range: string
  color: string
  darkColor: string
  min: number
  max: number
}

const qualitySegments: QualitySegment[] = [
  { label: 'Poor', range: '0-3', color: '#FDDAE2', darkColor: '#4A2535', min: 0, max: 3 },
  { label: 'Fair', range: '4-5', color: '#F9A8D4', darkColor: '#6B3A50', min: 4, max: 5 },
  { label: 'Good', range: '6-7', color: '#C084FC', darkColor: '#5A2A70', min: 6, max: 7 },
  { label: 'Great', range: '8-10', color: '#A78BFA', darkColor: '#4A3070', min: 8, max: 10 },
]

// ---------------------------------------------------------------------------
// Dark mode detection hook
// ---------------------------------------------------------------------------

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()

    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  return isDark
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
}

// ---------------------------------------------------------------------------
// Custom chart tooltip for sleep
// ---------------------------------------------------------------------------

function SleepChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const val = payload[0].value
  const qualityLabel =
    val <= 3 ? 'Poor' : val <= 5 ? 'Fair' : val <= 7 ? 'Good' : 'Great'

  return (
    <div className="bg-white/95 dark:bg-[#2A1520]/95 backdrop-blur-md border border-[#F9D0DA] dark:border-[#4A2535] rounded-xl px-4 py-3 shadow-lg shadow-[#C084FC]/10">
      <p className="text-xs font-medium text-[#9B6B7B] dark:text-[#A07888] mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2 text-sm">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: payload[0].color }}
        />
        <span className="text-[#6B3A4A] dark:text-[#C9A0B0]">Sleep:</span>
        <span className="font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
          {val}/10
        </span>
        <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">
          ({qualityLabel})
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SleepAnalysis({ phase }: SleepAnalysisProps) {
  const isDark = useIsDarkMode()
  const { toast } = useToast()
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch last 14 days of health logs
  useEffect(() => {
    async function fetchSleepData() {
      try {
        const res = await fetch('/api/health-logs?days=14')
        if (res.ok) {
          const data = await res.json()
          setLogs(data)
        }
      } catch (err) {
        console.error('Failed to fetch sleep data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSleepData()
  }, [])

  // Build chart data for last 7 days
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = format(addDays(new Date(), -6 + i), 'yyyy-MM-dd')
      const dayLabel = format(addDays(new Date(), -6 + i), 'EEE')
      const log = logs.find((l) => l.date === date)
      return {
        day: dayLabel,
        date,
        sleep: log?.sleep ?? null,
      }
    })
  }, [logs])

  // Compute stats from last 7 days of data
  const stats = useMemo(() => {
    const last7 = logs.slice(0, 7)
    if (last7.length === 0) {
      return { avg: 0, best: 0, bestDate: '', trend: 'stable' as const }
    }

    const sleepValues = last7.map((l) => l.sleep)
    const avg = sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length
    const bestIdx = sleepValues.indexOf(Math.max(...sleepValues))
    const best = sleepValues[bestIdx]
    const bestDate = last7[bestIdx]?.date ?? ''

    // Trend: compare last 3 days to previous 3 days
    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (sleepValues.length >= 4) {
      const recent = sleepValues.slice(0, Math.min(3, Math.floor(sleepValues.length / 2)))
      const older = sleepValues.slice(Math.min(3, Math.floor(sleepValues.length / 2)), Math.min(6, sleepValues.length))
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
        if (recentAvg > olderAvg + 0.5) trend = 'improving'
        else if (recentAvg < olderAvg - 0.5) trend = 'declining'
      }
    }

    return { avg: Math.round(avg * 10) / 10, best, bestDate, trend }
  }, [logs])

  // Quality distribution counts
  const distribution = useMemo(() => {
    const last7 = logs.slice(0, 7)
    if (last7.length === 0) return { Poor: 0, Fair: 0, Good: 0, Great: 0 }

    const counts = { Poor: 0, Fair: 0, Good: 0, Great: 0 }
    for (const log of last7) {
      if (log.sleep <= 3) counts.Poor++
      else if (log.sleep <= 5) counts.Fair++
      else if (log.sleep <= 7) counts.Good++
      else counts.Great++
    }
    return counts
  }, [logs])

  const totalNights = distribution.Poor + distribution.Fair + distribution.Good + distribution.Great

  // Get the sleep tip for the current phase
  const sleepTip = phaseSleepTips[phase] ?? defaultTip

  // Get phase color for the gradient accent
  const phaseColor =
    phase === 'Menstrual'
      ? '#E8788A'
      : phase === 'Follicular'
        ? '#F9A8D4'
        : phase === 'Ovulation'
          ? '#C084FC'
          : phase === 'Luteal'
            ? '#FDA4AF'
            : '#C084FC'

  // Handle Log Sleep button
  const handleLogSleep = () => {
    toast({
      title: 'Log Your Sleep',
      description: 'Use the Daily Check-in above to record your sleep quality.',
    })

    // Try to scroll to the daily check-in section
    const checkInSection = document.getElementById('daily-checkin')
    if (checkInSection) {
      checkInSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Trend icon and label
  const trendIcon =
    stats.trend === 'improving'
      ? TrendingUp
      : stats.trend === 'declining'
        ? TrendingDown
        : Minus
  const trendLabel =
    stats.trend === 'improving'
      ? 'Improving'
      : stats.trend === 'declining'
        ? 'Declining'
        : 'Stable'
  const trendColor =
    stats.trend === 'improving'
      ? '#34D399'
      : stats.trend === 'declining'
        ? '#E8788A'
        : '#F9A8D4'

  // Best night formatted
  const bestNightLabel = stats.bestDate
    ? format(parseISO(stats.bestDate), 'EEE')
    : '--'

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-[#C084FC] via-[#F9A8D4] to-[#E8788A]"
    >
      <div className="bg-white dark:bg-[#2A1520] rounded-[14px] h-full overflow-hidden">
        <div className="px-5 sm:px-6 py-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <Moon className="w-4 h-4 text-[#C084FC]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
                  Sleep Analysis
                </h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                  Your sleep quality over the past 7 days
                </p>
              </div>
            </div>

            {/* Log Sleep button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogSleep}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#C084FC] to-[#E8788A] hover:from-[#A06CD5] hover:to-[#D66A7C] text-white text-xs font-medium rounded-xl px-3.5 py-2 shadow-sm shadow-[#C084FC]/20 transition-colors"
            >
              <Moon className="w-3 h-3" />
              Log Sleep
            </motion.button>
          </div>

          {loading ? (
            /* Loading skeleton */
            <div className="space-y-4">
              <div className="h-[120px] bg-[#F9D0DA]/20 dark:bg-[#4A2535]/20 rounded-xl animate-pulse" />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-[#F9D0DA]/20 dark:bg-[#4A2535]/20 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : logs.length === 0 ? (
            /* Empty state */
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center mx-auto mb-3">
                <Moon className="w-6 h-6 text-[#C084FC]" />
              </div>
              <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">
                No sleep data yet
              </p>
              <p className="text-xs text-[#9B6B7B]/70 dark:text-[#A07888]/70 mt-1">
                Start logging to see your sleep analysis
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              {/* Mini Area Chart */}
              <motion.div variants={itemVariants}>
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="sleepGradientFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#C084FC" stopOpacity={0.35} />
                          <stop offset="50%" stopColor="#E8788A" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#E8788A" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: isDark ? '#A07888' : '#9B6B7B' }}
                        dy={8}
                      />
                      <YAxis
                        domain={[0, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: isDark ? '#A07888' : '#9B6B7B' }}
                        ticks={[0, 5, 10]}
                      />
                      <Tooltip content={<SleepChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="sleep"
                        stroke="#C084FC"
                        strokeWidth={2.5}
                        fill="url(#sleepGradientFill)"
                        dot={{
                          r: 3,
                          fill: '#C084FC',
                          stroke: isDark ? '#2A1520' : '#fff',
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 5,
                          fill: '#C084FC',
                          stroke: isDark ? '#2A1520' : '#fff',
                          strokeWidth: 2,
                        }}
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-3 gap-3"
              >
                {/* Average Sleep */}
                <div className="bg-gradient-to-br from-[#F5F3FF] dark:from-[#2A1A30] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-3 text-center">
                  <Moon className="w-3.5 h-3.5 text-[#C084FC] mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-[#C084FC]">{stats.avg}</p>
                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">
                    Avg Score
                  </p>
                </div>

                {/* Best Night */}
                <div className="bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-3 text-center">
                  <Star className="w-3.5 h-3.5 text-[#E8788A] mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-[#E8788A]">{stats.best}</p>
                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">
                    Best ({bestNightLabel})
                  </p>
                </div>

                {/* Trend */}
                <div className="bg-gradient-to-br from-[#FDF2F8] dark:from-[#2A1A28] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-3 text-center">
                  {(() => {
                    const TrendIcon = trendIcon
                    return <TrendIcon className="w-3.5 h-3.5 mx-auto mb-1.5" style={{ color: trendColor }} />
                  })()}
                  <p className="text-xl font-bold" style={{ color: trendColor }}>
                    {trendLabel}
                  </p>
                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">
                    Trend
                  </p>
                </div>
              </motion.div>

              {/* Sleep Quality Distribution Bar */}
              <motion.div variants={itemVariants}>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] font-medium mb-2.5">
                  Quality Distribution
                </p>
                <div className="space-y-2">
                  {/* Stacked horizontal bar */}
                  <div className="flex h-5 rounded-lg overflow-hidden bg-[#F5F3FF]/50 dark:bg-[#2A1A30]/50">
                    {qualitySegments.map((seg) => {
                      const count =
                        seg.label === 'Poor'
                          ? distribution.Poor
                          : seg.label === 'Fair'
                            ? distribution.Fair
                            : seg.label === 'Good'
                              ? distribution.Good
                              : distribution.Great
                      const pct = totalNights > 0 ? (count / totalNights) * 100 : 0
                      if (pct === 0) return null
                      return (
                        <motion.div
                          key={seg.label}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay: 0.3 }}
                          className="h-full"
                          style={{
                            backgroundColor: isDark ? seg.darkColor : seg.color,
                          }}
                          title={`${seg.label}: ${count} night${count !== 1 ? 's' : ''}`}
                        />
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1">
                    {qualitySegments.map((seg) => {
                      const count =
                        seg.label === 'Poor'
                          ? distribution.Poor
                          : seg.label === 'Fair'
                            ? distribution.Fair
                            : seg.label === 'Good'
                              ? distribution.Good
                              : distribution.Great
                      return (
                        <div key={seg.label} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{
                              backgroundColor: isDark ? seg.darkColor : seg.color,
                            }}
                          />
                          <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">
                            {seg.label} ({seg.range})
                          </span>
                          <span className="text-[10px] font-semibold text-[#6B3A4A] dark:text-[#C9A0B0]">
                            {count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Phase-based Sleep Tip */}
              <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl">
                {/* Gradient accent strip on left */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  style={{
                    background: `linear-gradient(180deg, ${phaseColor}, ${phaseColor}60)`,
                  }}
                />

                <div
                  className="pl-4 pr-3 py-3.5 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${phaseColor}10 0%, ${phaseColor}05 60%, transparent 100%)`,
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: `linear-gradient(135deg, ${phaseColor}20, ${phaseColor}08)`,
                      }}
                    >
                      <Moon className="w-3.5 h-3.5" style={{ color: phaseColor }} />
                    </div>
                    <div>
                      <p
                        className="text-xs font-semibold mb-0.5"
                        style={{ color: phaseColor }}
                      >
                        {sleepTip.title}
                      </p>
                      <p className="text-[11px] leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">
                        {sleepTip.description}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
