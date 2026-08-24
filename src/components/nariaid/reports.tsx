'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { format, subDays, parseISO, isValid, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import {
  FileBarChart,
  Download,
  Printer,
  CalendarDays,
  TrendingUp,
  BarChart3,
  PieChartIcon,
  Activity,
  Heart,
  Moon,
  Zap,
  Flame,
  Droplets,
  ClipboardList,
  Clock,
  ChevronDown,
  Sparkles,
  Trophy,
  AlertCircle,
  RefreshCcw,
  Database,
  ShieldCheck,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCyclePrediction, getCycleRiskAssessment, type CycleRiskAssessment } from '@/lib/cycle-prediction'

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
  exercise: string
  weight: number
}

interface WellnessEntry {
  id: string
  date: string
  meditationMinutes: number
  gratitude: string
  selfCareActivity: string
  journal: string
}

interface ProfileData {
  id: string
  cycleLength: number
  lastPeriodStart: string
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

type ReportType = 'weekly' | 'monthly' | 'custom'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_COLORS = ['#E8788A', '#F9A8D4', '#C084FC', '#FDA4AF', '#A78BFA', '#34D399', '#FBBF24', '#60A5FA']

const ALL_SYMPTOMS = [
  'Hot Flashes', 'Night Sweats', 'Headache', 'Bloating', 'Fatigue',
  'Anxiety', 'Mood Swings', 'Insomnia', 'Cramps', 'Nausea',
  'Breast Tenderness', 'Acne',
]

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
// Custom chart tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white/95 dark:bg-[#2A1520]/95 backdrop-blur-md border border-[#F9D0DA] dark:border-[#4A2535] rounded-xl px-4 py-3 shadow-lg shadow-[#E8788A]/5">
      <p className="text-xs font-medium text-[#9B6B7B] dark:text-[#A07888] mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-[#6B3A4A] dark:text-[#C9A0B0] capitalize">{entry.name}:</span>
          <span className="font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function formatDateSafe(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (isValid(parsed)) return format(parsed, 'MMM d')
    return dateStr
  } catch {
    return dateStr
  }
}

function getDateRange(type: ReportType, customStart?: string, customEnd?: string) {
  const now = new Date()
  if (type === 'weekly') {
    const start = startOfWeek(now, { weekStartsOn: 1 })
    const end = endOfWeek(now, { weekStartsOn: 1 })
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
  }
  if (type === 'monthly') {
    const start = startOfMonth(now)
    const end = endOfMonth(now)
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
  }
  return {
    start: customStart || format(subDays(now, 30), 'yyyy-MM-dd'),
    end: customEnd || format(now, 'yyyy-MM-dd'),
  }
}

function MyEnteredDataCard({
  healthLogs,
  assessment,
  onExportCSV,
  csvExporting,
}: {
  healthLogs: HealthLog[]
  assessment: CycleRiskAssessment
  onExportCSV: () => void
  csvExporting: boolean
}) {
  const rows = healthLogs.slice().sort((a, b) => b.date.localeCompare(a.date))

  return (
    <motion.div
      custom={2}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-[#F9D0DA]/70 bg-white shadow-sm shadow-[#E8788A]/5 dark:border-[#4A2535]/70 dark:bg-[#2A1520]"
    >
      <div className="px-5 py-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030]">
              <Database className="h-4 w-4 text-[#E8788A]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">My Entered Data</h2>
              <p className="text-xs leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">Every health log row stored on this website, with CSV export.</p>
            </div>
          </div>
          <Button
            onClick={onExportCSV}
            variant="outline"
            disabled={rows.length === 0 || csvExporting}
            className="rounded-xl border-[#F9D0DA] text-[#E8788A] hover:bg-[#FFF0F3] dark:border-[#4A2535] dark:bg-[#3A2030] dark:hover:bg-[#3A2030]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {csvExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        <div className="mb-4 rounded-xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/50">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#2F7D62]" />
            <p className="text-xs font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Current model read</p>
          </div>
          <p className="text-sm leading-relaxed text-[#4A1D2E] dark:text-[#F9D0DA]">{assessment.title}: {assessment.summary}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">
            Trained for {assessment.modelTarget}. {assessment.modelPerformance}. Data quality: {assessment.dataQuality.status}.
          </p>
        </div>

        <div className="max-h-[420px] overflow-auto rounded-xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/70">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="sticky top-0 bg-[#FFF0F3] text-[#6B3A4A] dark:bg-[#3A2030] dark:text-[#F9D0DA]">
              <tr>
                {['Date', 'Mood', 'Energy', 'Sleep', 'Stress', 'Pain', 'Water', 'Symptoms', 'Notes'].map((heading) => (
                  <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9D0DA]/60 dark:divide-[#4A2535]/70">
              {rows.map((log) => (
                <tr key={log.id} className="bg-white text-[#4A1D2E] dark:bg-[#2A1520] dark:text-[#F9D0DA]">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">{log.date}</td>
                  <td className="px-3 py-2">{log.mood}/10</td>
                  <td className="px-3 py-2">{log.energy}/10</td>
                  <td className="px-3 py-2">{log.sleep}/10</td>
                  <td className="px-3 py-2">{log.stress}/10</td>
                  <td className="px-3 py-2">{log.pain}/10</td>
                  <td className="px-3 py-2">{log.waterIntake}</td>
                  <td className="max-w-[180px] px-3 py-2 text-[#8F5366] dark:text-[#A07888]">{log.symptoms || '-'}</td>
                  <td className="max-w-[220px] px-3 py-2 text-[#8F5366] dark:text-[#A07888]">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <p className="mt-4 text-center text-sm text-[#9B6B7B] dark:text-[#A07888]">No health log rows yet.</p>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main Reports Component
// ---------------------------------------------------------------------------

export default function Reports() {
  // ---- Data state ----
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([])
  const [wellnessEntries, setWellnessEntries] = useState<WellnessEntry[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [backendRiskAssessment, setBackendRiskAssessment] = useState<CycleRiskAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportGenerated, setReportGenerated] = useState(false)

  // ---- Report state ----
  const [reportType, setReportType] = useState<ReportType>('weekly')
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'))

  // ---- Print state ----
  const [printMode, setPrintMode] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // ---- Fetch all data ----
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [logsRes, wellnessRes, remindersRes, profileRes] = await Promise.all([
        fetch('/api/health-logs'),
        fetch('/api/wellness'),
        fetch('/api/reminders'),
        fetch('/api/profile'),
      ])

      let logsData: HealthLog[] = []
      let wellnessData: WellnessEntry[] = []
      let remindersData: Reminder[] = []
      let profileData: ProfileData | null = null

      if (logsRes.ok) { logsData = await logsRes.json(); setHealthLogs(logsData) }
      if (wellnessRes.ok) { wellnessData = await wellnessRes.json(); setWellnessEntries(wellnessData) }
      if (remindersRes.ok) { remindersData = await remindersRes.json(); setReminders(remindersData) }
      if (profileRes.ok) { profileData = await profileRes.json(); setProfile(profileData) }

      // Auto-generate report if there is data
      if (logsData.length > 0) {
        setReportGenerated(true)
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err)
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

  // ---- Date range ----
  const dateRange = useMemo(
    () => getDateRange(reportType, customStart, customEnd),
    [reportType, customStart, customEnd]
  )

  // ---- Filter data by date range ----
  const filteredLogs = useMemo(
    () => healthLogs.filter(log => log.date >= dateRange.start && log.date <= dateRange.end),
    [healthLogs, dateRange]
  )

  const filteredWellness = useMemo(
    () => wellnessEntries.filter(e => e.date >= dateRange.start && e.date <= dateRange.end),
    [wellnessEntries, dateRange]
  )

  // ---- Averages ----
  const averages = useMemo(() => {
    if (filteredLogs.length === 0) return null
    const count = filteredLogs.length
    return {
      mood: Math.round((filteredLogs.reduce((s, l) => s + l.mood, 0) / count) * 10) / 10,
      energy: Math.round((filteredLogs.reduce((s, l) => s + l.energy, 0) / count) * 10) / 10,
      sleep: Math.round((filteredLogs.reduce((s, l) => s + l.sleep, 0) / count) * 10) / 10,
      stress: Math.round((filteredLogs.reduce((s, l) => s + l.stress, 0) / count) * 10) / 10,
      waterIntake: Math.round((filteredLogs.reduce((s, l) => s + l.waterIntake, 0) / count) * 10) / 10,
      meditation: filteredWellness.length > 0
        ? Math.round((filteredWellness.reduce((s, e) => s + e.meditationMinutes, 0) / filteredWellness.length) * 10) / 10
        : 0,
    }
  }, [filteredLogs, filteredWellness])

  // ---- Symptom frequency ----
  const symptomData = useMemo(() => {
    const freq: Record<string, number> = {}
    ALL_SYMPTOMS.forEach(s => { freq[s] = 0 })
    filteredLogs.forEach(log => {
      if (log.symptoms) {
        log.symptoms.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
          if (freq[s] !== undefined) freq[s]++
        })
      }
    })
    return ALL_SYMPTOMS
      .map(name => ({ name, count: freq[name] }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [filteredLogs])

  // ---- Mood/Energy trend data ----
  const trendData = useMemo(() => {
    return filteredLogs
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(log => ({
        date: formatDateSafe(log.date),
        mood: log.mood,
        energy: log.energy,
        sleep: log.sleep,
        stress: log.stress,
      }))
  }, [filteredLogs])

  // ---- Activity distribution ----
  const activityData = useMemo(() => {
    const counts: Record<string, number> = { health: 0, wellness: 0, reminders: 0 }
    filteredLogs.forEach(() => { counts.health++ })
    filteredWellness.forEach(() => { counts.wellness++ })
    reminders.filter(r => r.active).forEach(() => { counts.reminders++ })

    return [
      { name: 'Health Logs', value: counts.health, color: '#E8788A' },
      { name: 'Wellness', value: counts.wellness, color: '#C084FC' },
      { name: 'Reminders', value: counts.reminders, color: '#F9A8D4' },
    ].filter(d => d.value > 0)
  }, [filteredLogs, filteredWellness, reminders])

  const cyclePrediction = useMemo(() => getCyclePrediction({ profile, healthLogs }), [profile, healthLogs])
  const localRiskAssessment = useMemo(
    () => getCycleRiskAssessment({ profile, healthLogs, prediction: cyclePrediction }),
    [profile, healthLogs, cyclePrediction]
  )
  const riskAssessment = backendRiskAssessment ?? localRiskAssessment

  // ---- Achievements ----
  const achievements = useMemo(() => {
    const list: { label: string; description: string; color: string }[] = []

    if (filteredLogs.length >= 7) {
      list.push({ label: 'Consistent Tracker', description: `${filteredLogs.length} logs recorded`, color: '#E8788A' })
    }
    if (averages && averages.mood >= 7) {
      list.push({ label: 'High Spirits', description: `Avg mood: ${averages.mood}/10`, color: '#34D399' })
    }
    if (averages && averages.sleep >= 7) {
      list.push({ label: 'Restful Sleeper', description: `Avg sleep: ${averages.sleep}/10`, color: '#C084FC' })
    }
    if (averages && averages.meditation >= 10) {
      list.push({ label: 'Mindful Moments', description: `Avg ${averages.meditation}m meditation`, color: '#F9A8D4' })
    }
    if (averages && averages.waterIntake >= 8) {
      list.push({ label: 'Hydration Hero', description: `Avg ${averages.waterIntake} glasses/day`, color: '#60A5FA' })
    }

    return list
  }, [filteredLogs, averages])

  // ---- Generate report ----
  const handleGenerateReport = useCallback(() => {
    setReportGenerated(true)
  }, [])

  // ---- Navigate to health log ----
  const goToHealthLog = useCallback(() => {
    const store = useAppStore.getState()
    store.setActiveTab('health-log')
  }, [])

  // ---- Export CSV via API ----
  const [csvExporting, setCsvExporting] = useState(false)

  const handleExportCSV = useCallback(async () => {
    if (filteredLogs.length === 0) return
    setCsvExporting(true)
    try {
      const res = await fetch('/api/health-logs?format=csv')
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `nariaid-health-report-${dateRange.start}-to-${dateRange.end}.csv`
        link.click()
        URL.revokeObjectURL(url)

        // Show success toast
        if (typeof window !== 'undefined') {
          const toastEvent = new CustomEvent('nariaid-toast', {
            detail: { message: 'Data exported successfully', type: 'success' },
          })
          window.dispatchEvent(toastEvent)
        }
      }
    } catch (err) {
      console.error('Failed to export CSV:', err)
    } finally {
      setCsvExporting(false)
    }
  }, [filteredLogs, dateRange])

  // ---- Print ----
  const handlePrint = useCallback(() => {
    setPrintMode(true)
    setTimeout(() => {
      window.print()
      setPrintMode(false)
    }, 300)
  }, [])

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
        className="absolute top-[-70px] right-[-70px] w-[260px] h-[260px] rounded-full opacity-25 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #F9A8D4 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blob 9s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[350px] left-[-90px] w-[250px] h-[250px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 11s ease-in-out infinite 2s',
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-4 py-6 pb-24 max-w-2xl mx-auto space-y-5" ref={printRef}>

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
                'radial-gradient(ellipse at 60% 20%, #F9A8D4 0%, transparent 60%), radial-gradient(ellipse at 30% 70%, #E8788A 0%, transparent 50%)',
            }}
          />
          <div className="relative bg-white/70 dark:bg-[#2A1520]/70 backdrop-blur-md border border-[#F9D0DA]/50 dark:border-[#4A2535]/50 rounded-2xl px-6 py-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1">Insights & Analytics</p>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                  <span className="gradient-text-animated">Reports</span>
                </h1>
                <p className="text-[#9B6B7B] dark:text-[#A07888] text-sm">
                  Understand your health patterns and trends
                </p>
              </div>
              <div className="shrink-0 ml-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E8788A] to-[#C084FC] flex items-center justify-center shadow-lg shadow-[#E8788A]/15">
                  <FileBarChart className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 2. Report Type Selector                                       */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={1} gradient="from-[#E8788A] via-[#F9A8D4] to-[#C084FC]">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Report Period</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Select the time range for your report</p>
              </div>
            </div>

            <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)} className="w-full">
              <TabsList className="w-full bg-[#FFF0F3] dark:bg-[#3A2030] rounded-xl h-auto p-1 gap-1">
                <TabsTrigger
                  value="weekly"
                  className="flex-1 rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#E8788A] text-[#9B6B7B] dark:text-[#A07888] py-2"
                >
                  Weekly
                </TabsTrigger>
                <TabsTrigger
                  value="monthly"
                  className="flex-1 rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#E8788A] text-[#9B6B7B] dark:text-[#A07888] py-2"
                >
                  Monthly
                </TabsTrigger>
                <TabsTrigger
                  value="custom"
                  className="flex-1 rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#E8788A] text-[#9B6B7B] dark:text-[#A07888] py-2"
                >
                  Custom
                </TabsTrigger>
              </TabsList>

              {reportType === 'custom' && (
                <TabsContent value="custom" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Start Date</Label>
                      <Input
                        type="date"
                        value={customStart}
                        onChange={e => setCustomStart(e.target.value)}
                        className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-[#9B6B7B] dark:text-[#A07888]">End Date</Label>
                      <Input
                        type="date"
                        value={customEnd}
                        onChange={e => setCustomEnd(e.target.value)}
                        className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-9 text-xs"
                      />
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>

            <div className="mt-4 flex items-center gap-2 text-xs text-[#9B6B7B] dark:text-[#A07888]">
              <Clock className="w-3 h-3" />
              <span>
                {format(parseISO(dateRange.start), 'MMM d, yyyy')} - {format(parseISO(dateRange.end), 'MMM d, yyyy')}
              </span>
              <span className="ml-auto font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">{filteredLogs.length} logs</span>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleGenerateReport}
                className="flex-1 bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl py-2 text-sm font-medium shadow-sm shadow-[#E8788A]/20 h-auto btn-press"
              >
                <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                Generate Report
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                disabled={filteredLogs.length === 0 || csvExporting}
                className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] text-[#E8788A] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] h-auto py-2 text-sm btn-press"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {csvExporting ? 'Exporting...' : 'CSV'}
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                disabled={filteredLogs.length === 0}
                className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] h-auto py-2 text-sm"
              >
                <Printer className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </GradientBorderCard>

        <MyEnteredDataCard
          healthLogs={healthLogs}
          assessment={riskAssessment}
          onExportCSV={handleExportCSV}
          csvExporting={csvExporting}
        />

        {/* Only show report content when generated */}
        {reportGenerated && filteredLogs.length > 0 && (
          <>
            {/* ============================================================ */}
            {/* 3. Summary Stats                                              */}
            {/* ============================================================ */}
            <motion.div
              custom={2}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden animated-gradient-border-slow card-press"
            >
              <div className="px-6 py-5">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[#E8788A]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Summary Averages</h2>
                    <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Key metrics over the selected period</p>
                  </div>
                </div>

                {averages && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Mood', value: averages.mood, icon: Heart, color: '#E8788A', max: 10 },
                      { label: 'Energy', value: averages.energy, icon: Zap, color: '#F9A8D4', max: 10 },
                      { label: 'Sleep', value: averages.sleep, icon: Moon, color: '#C084FC', max: 10 },
                      { label: 'Stress', value: averages.stress, icon: Flame, color: '#FDA4AF', max: 10 },
                      { label: 'Water', value: averages.waterIntake, icon: Droplets, color: '#60A5FA', max: 15 },
                      { label: 'Meditation', value: averages.meditation, icon: Sparkles, color: '#34D399', max: 30 },
                    ].map((stat) => {
                      const Icon = stat.icon
                      return (
                        <div key={stat.label} className="bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-3 text-center">
                          <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: stat.color }} />
                          <motion.p
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                            className="text-xl font-bold"
                            style={{ color: stat.color }}
                          >
                            {stat.value}
                          </motion.p>
                          <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">{stat.label}</p>
                          <div className="mt-1.5 h-1 bg-white/60 dark:bg-[#2A1520]/60 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (stat.value / stat.max) * 100)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: stat.color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* 4. Achievements                                               */}
            {/* ============================================================ */}
            {achievements.length > 0 && (
              <GradientBorderCard animateIndex={3} gradient="from-[#34D399] via-[#F9A8D4] to-[#E8788A]">
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#34D399]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-[#34D399]" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Achievements</h2>
                      <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Milestones you have reached</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {achievements.map((ach) => (
                      <motion.div
                        key={ach.label}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#FFF5F7]/40 dark:to-[#2A1520]/40 rounded-xl p-3 border border-[#F9D0DA]/20"
                      >
                        <p className="text-xs font-semibold" style={{ color: ach.color }}>{ach.label}</p>
                        <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">{ach.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GradientBorderCard>
            )}

            {/* ============================================================ */}
            {/* 5. Data Visualization Grid                                    */}
            {/* ============================================================ */}
            <GradientBorderCard animateIndex={4} gradient="from-[#C084FC] via-[#F9A8D4] to-[#E8788A]" className="glass-card-hover card-press">
              <div className="px-6 py-5">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-[#C084FC]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Data Visualization</h2>
                    <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Visual breakdown of your health data</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Mood & Energy Trend Line */}
                  {trendData.length > 1 && (
                    <div>
                      <p className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0] mb-2 flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-[#E8788A]" />
                        Mood & Energy Trend
                      </p>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F9D0DA" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={{ stroke: '#F9D0DA' }} tickLine={false} />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={false} tickLine={false} width={30} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="mood" stroke="#E8788A" strokeWidth={2.5} dot={{ fill: '#E8788A', r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="energy" stroke="#C084FC" strokeWidth={2.5} dot={{ fill: '#C084FC', r: 3 }} activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Sleep & Stress Area */}
                  {trendData.length > 1 && (
                    <div>
                      <p className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0] mb-2 flex items-center gap-1.5">
                        <Moon className="w-3 h-3 text-[#C084FC]" />
                        Sleep & Stress Over Time
                      </p>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData}>
                            <defs>
                              <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C084FC" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#C084FC" stopOpacity={0.05} />
                              </linearGradient>
                              <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FDA4AF" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#FDA4AF" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F9D0DA" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={{ stroke: '#F9D0DA' }} tickLine={false} />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={false} tickLine={false} width={30} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="sleep" stroke="#C084FC" fill="url(#sleepGrad)" strokeWidth={2} />
                            <Area type="monotone" dataKey="stress" stroke="#FDA4AF" fill="url(#stressGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Top Symptoms Bar Chart */}
                  {symptomData.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0] mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 text-[#FDA4AF]" />
                        Top Symptoms
                      </p>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={symptomData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F9D0DA" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#9B6B7B' }} axisLine={false} tickLine={false} width={90} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                              {symptomData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Activity Distribution Pie */}
                  {activityData.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0] mb-2 flex items-center gap-1.5">
                        <PieChartIcon className="w-3 h-3 text-[#F9A8D4]" />
                        Activity Distribution
                      </p>
                      <div className="h-[180px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={activityData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {activityData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-2">
                        {activityData.map((entry) => (
                          <div key={entry.name} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">{entry.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GradientBorderCard>

            {/* ============================================================ */}
            {/* 6. Print-Friendly View                                        */}
            {/* ============================================================ */}
            {printMode && (
              <div className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden print:border-0 print:rounded-none">
                <div className="px-6 py-5">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">NariAid Health Report</h2>
                    <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                      {format(parseISO(dateRange.start), 'MMMM d, yyyy')} - {format(parseISO(dateRange.end), 'MMMM d, yyyy')}
                    </p>
                  </div>

                  {averages && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {[
                        { label: 'Avg Mood', value: averages.mood },
                        { label: 'Avg Energy', value: averages.energy },
                        { label: 'Avg Sleep', value: averages.sleep },
                        { label: 'Avg Stress', value: averages.stress },
                        { label: 'Avg Water', value: averages.waterIntake },
                        { label: 'Entries', value: filteredLogs.length },
                      ].map(item => (
                        <div key={item.label} className="text-center border border-[#F9D0DA]/30 dark:border-[#4A2535]/30 rounded-lg p-3">
                          <p className="text-lg font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">{item.value}</p>
                          <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {symptomData.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA] mb-2">Top Symptoms</h3>
                      <div className="space-y-1">
                        {symptomData.map(s => (
                          <div key={s.name} className="flex items-center justify-between text-xs">
                            <span className="text-[#6B3A4A] dark:text-[#C9A0B0]">{s.name}</span>
                            <span className="text-[#9B6B7B] dark:text-[#A07888]">{s.count}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] text-center mt-4">
                    Generated by NariAid on {format(new Date(), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* No data state - enhanced */}
        {filteredLogs.length === 0 && !loading && (
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
          >
            <div className="px-6 py-12 text-center">
              {/* Large gradient icon illustration */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div
                  className="absolute inset-0 rounded-2xl opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #E8788A 0%, #F9A8D4 50%, #C084FC 100%)',
                  }}
                />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E8788A]/20 to-[#C084FC]/20 dark:from-[#E8788A]/30 dark:to-[#C084FC]/30 flex items-center justify-center border border-[#F9D0DA]/40 dark:border-[#4A2535]/60">
                  <ClipboardList className="w-9 h-9 text-[#E8788A]" />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-[#4A1D2E] dark:text-[#F9D0DA] mb-2">Start Tracking to See Reports</h3>
              <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] max-w-xs mx-auto mb-6">
                Log your daily health data to unlock personalized insights, trends, and achievement reports.
              </p>

              {/* Feature preview cards */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-6">
                {[
                  { icon: TrendingUp, label: 'Trends', color: '#E8788A' },
                  { icon: BarChart3, label: 'Charts', color: '#C084FC' },
                  { icon: Trophy, label: 'Achievements', color: '#34D399' },
                ].map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <div key={item.label} className="bg-[#FFF5F7] dark:bg-[#3A2030] rounded-xl p-3 text-center">
                      <ItemIcon className="w-4 h-4 mx-auto mb-1" style={{ color: item.color }} />
                      <p className="text-[9px] text-[#9B6B7B] dark:text-[#A07888] font-medium">{item.label}</p>
                    </div>
                  )
                })}
              </div>

              {/* CTA Button */}
              <Button
                onClick={goToHealthLog}
                className="bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl px-6 py-2.5 text-sm font-medium shadow-sm shadow-[#E8788A]/20 h-auto"
              >
                Go to Health Log
              </Button>
            </div>
          </motion.div>
        )}

      </div>
    </motion.div>
  )
}
