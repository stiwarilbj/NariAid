'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { format, parseISO, subDays, isValid } from 'date-fns'
import {
  Sun,
  Zap,
  Moon,
  Flame,
  Droplets,
  Dumbbell,
  Scale,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Trash2,
  CalendarDays,
  Activity,
  TrendingUp,
  Heart,
  AlertCircle,
  FileText,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HealthLogEntry {
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
  createdAt: string
  updatedAt: string
}

interface SymptomFreq {
  name: string
  count: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_SYMPTOMS = [
  'Hot Flashes',
  'Night Sweats',
  'Headache',
  'Bloating',
  'Fatigue',
  'Anxiety',
  'Mood Swings',
  'Insomnia',
  'Cramps',
  'Nausea',
  'Breast Tenderness',
  'Acne',
]

const EXERCISE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'walking', label: 'Walking' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'strength', label: 'Strength Training' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'dance', label: 'Dance' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'other', label: 'Other' },
]

const SYMPTOM_COLORS: Record<string, string> = {
  'Hot Flashes': '#E8788A',
  'Night Sweats': '#D4677A',
  'Headache': '#C084FC',
  'Bloating': '#F9A8D4',
  'Fatigue': '#A78BFA',
  'Anxiety': '#FDA4AF',
  'Mood Swings': '#E8788A',
  'Insomnia': '#9B6B7B',
  'Cramps': '#D4677A',
  'Nausea': '#C084FC',
  'Breast Tenderness': '#F9A8D4',
  'Acne': '#A78BFA',
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

const numberVariants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.3 + i * 0.1,
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
    },
  }),
}

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
}

// ---------------------------------------------------------------------------
// Helper: slider label functions
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

function getStressLabel(val: number): string {
  if (val <= 2) return 'Calm'
  if (val <= 4) return 'Relaxed'
  if (val <= 6) return 'Moderate'
  if (val <= 8) return 'Tense'
  return 'Overwhelmed'
}

function getPainLabel(val: number): string {
  if (val === 0) return 'None'
  if (val <= 2) return 'Mild'
  if (val <= 4) return 'Moderate'
  if (val <= 6) return 'Significant'
  if (val <= 8) return 'Severe'
  return 'Extreme'
}

function formatDateSafe(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (isValid(parsed)) return format(parsed, 'MMM d, yyyy')
    return dateStr
  } catch {
    return dateStr
  }
}

function formatShortDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (isValid(parsed)) return format(parsed, 'EEE, MMM d')
    return dateStr
  } catch {
    return dateStr
  }
}

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white/95 dark:bg-[#2A1520]/95 backdrop-blur-md border border-[#F9D0DA] dark:border-[#4A2535] rounded-xl px-4 py-3 shadow-lg shadow-[#E8788A]/5">
      <p className="text-xs font-medium text-[#9B6B7B] dark:text-[#A07888] mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color || '#E8788A' }}
          />
          <span className="text-[#6B3A4A] dark:text-[#C9A0B0]">Reports:</span>
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
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative rounded-2xl p-[1.5px] bg-gradient-to-br ${gradient} card-press ${className}`}
    >
      <div className="bg-white dark:bg-[#2A1520] rounded-[14px] h-full">
        {children}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Score pill component
// ---------------------------------------------------------------------------

function ScorePill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#FFF0F3] dark:bg-[#3A2030] rounded-lg px-2.5 py-1.5">
      <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main HealthLog Component
// ---------------------------------------------------------------------------

export default function HealthLog() {
  const { userName, setActiveTab } = useAppStore()

  // ---- Data state ----
  const [logs, setLogs] = useState<HealthLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // ---- Form state ----
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [mood, setMood] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [sleep, setSleep] = useState(5)
  const [stress, setStress] = useState(5)
  const [pain, setPain] = useState(0)
  const [waterIntake, setWaterIntake] = useState(0)
  const [exercise, setExercise] = useState('none')
  const [weight, setWeight] = useState('')
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  // ---- Entry expansion state ----
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // ---- Fetch data ----
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/health-logs', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (err) {
      console.error('Failed to fetch health logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // ---- Toggle symptom checkbox ----
  const toggleSymptom = useCallback((symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    )
  }, [])

  // ---- Submit form ----
  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      const isFirstHealthLog = logs.length === 0
      const payload = {
        date: formDate,
        mood,
        energy,
        sleep,
        stress,
        pain,
        symptoms: selectedSymptoms.join(','),
        notes,
        waterIntake,
        exercise,
        weight: weight ? parseFloat(weight) : 0,
      }

      const res = await fetch('/api/health-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        await fetchLogs()
        // Reset form to defaults
        setMood(5)
        setEnergy(5)
        setSleep(5)
        setStress(5)
        setPain(0)
        setWaterIntake(0)
        setExercise('none')
        setWeight('')
        setSelectedSymptoms([])
        setNotes('')
        setFormOpen(false)
        if (isFirstHealthLog) setActiveTab('progress')
      }
    } catch (err) {
      console.error('Failed to save health log:', err)
    } finally {
      setSaving(false)
    }
  }, [formDate, mood, energy, sleep, stress, pain, selectedSymptoms, notes, waterIntake, exercise, weight, fetchLogs, logs.length, setActiveTab])

  // ---- Delete entry ----
  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/health-logs?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchLogs()
      }
    } catch (err) {
      console.error('Failed to delete health log:', err)
    } finally {
      setDeleting(null)
    }
  }, [fetchLogs])

  // ---- Toggle entry expansion ----
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ---- Reset form ----
  const resetForm = useCallback(() => {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setMood(5)
    setEnergy(5)
    setSleep(5)
    setStress(5)
    setPain(0)
    setWaterIntake(0)
    setExercise('none')
    setWeight('')
    setSelectedSymptoms([])
    setNotes('')
  }, [])

  // ---- Derived data ----
  const recentLogs = useMemo(() => logs.slice(0, 10), [logs])

  const symptomFrequencyData: SymptomFreq[] = useMemo(() => {
    const freq: Record<string, number> = {}
    ALL_SYMPTOMS.forEach(s => { freq[s] = 0 })
    logs.forEach(log => {
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
  }, [logs])

  const thirtyDayAverages = useMemo(() => {
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const recentLogs30 = logs.filter(l => l.date >= thirtyDaysAgo)

    if (recentLogs30.length === 0) return null

    const count = recentLogs30.length
    const avgMood = Math.round((recentLogs30.reduce((s, l) => s + l.mood, 0) / count) * 10) / 10
    const avgEnergy = Math.round((recentLogs30.reduce((s, l) => s + l.energy, 0) / count) * 10) / 10
    const avgSleep = Math.round((recentLogs30.reduce((s, l) => s + l.sleep, 0) / count) * 10) / 10
    const avgStress = Math.round((recentLogs30.reduce((s, l) => s + l.stress, 0) / count) * 10) / 10
    const avgPain = Math.round((recentLogs30.reduce((s, l) => s + l.pain, 0) / count) * 10) / 10
    const avgWater = Math.round((recentLogs30.reduce((s, l) => s + l.waterIntake, 0) / count) * 10) / 10

    // Exercise breakdown
    const exerciseCounts: Record<string, number> = {}
    recentLogs30.forEach(l => {
      if (l.exercise && l.exercise !== 'none') {
        exerciseCounts[l.exercise] = (exerciseCounts[l.exercise] || 0) + 1
      }
    })
    const topExercise = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0]

    // Weight tracking
    const weights = recentLogs30.filter(l => l.weight > 0).map(l => l.weight)
    const avgWeight = weights.length > 0
      ? Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10
      : null

    return {
      count,
      avgMood,
      avgEnergy,
      avgSleep,
      avgStress,
      avgPain,
      avgWater,
      topExercise: topExercise ? topExercise[0] : null,
      avgWeight,
    }
  }, [logs])

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
      className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0D12] relative overflow-hidden"
    >
      {/* ================================================================ */}
      {/* Decorative background blobs                                       */}
      {/* ================================================================ */}
      <div
        className="absolute top-[-60px] right-[-80px] w-[300px] h-[300px] rounded-full opacity-25 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #F9A8D4 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blob 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[400px] left-[-100px] w-[250px] h-[250px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #E8788A 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 10s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute bottom-[200px] right-[-60px] w-[220px] h-[220px] rounded-full opacity-15 dark:opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 12s ease-in-out infinite 4s',
        }}
      />

      {/* ================================================================ */}
      {/* Content                                                           */}
      {/* ================================================================ */}
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
                'radial-gradient(ellipse at 70% 20%, #F9A8D4 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, #E8788A 0%, transparent 50%)',
            }}
          />
          <div className="relative bg-white/70 dark:bg-[#2A1520]/70 backdrop-blur-md border border-[#F9D0DA]/50 dark:border-[#4A2535]/50 rounded-2xl px-6 py-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1">Health Tracking</p>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                  <span className="gradient-text-animated">Health Log</span>
                </h1>
                <p className="text-[#9B6B7B] dark:text-[#A07888] text-sm">
                  Track your symptoms, mood, and daily wellness patterns
                </p>
              </div>
              <div className="shrink-0 ml-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] flex items-center justify-center shadow-lg shadow-[#E8788A]/15">
                  <ClipboardList className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 2. New Entry Form Card                                        */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={1} gradient="from-[#E8788A] via-[#F9A8D4] to-[#FDA4AF]">
          <div className="px-6 py-5">
            <Collapsible open={formOpen} onOpenChange={setFormOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between btn-press">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-[#E8788A]" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">New Entry</h2>
                      <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Log how you are feeling today</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: formOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ChevronDown className="w-5 h-5 text-[#9B6B7B] dark:text-[#A07888]" />
                  </motion.div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                  className="mt-5 space-y-5"
                >
                  {/* Date picker */}
                  <div className="space-y-2">
                    <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Date</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B6B7B] dark:text-[#A07888]" />
                      <Input
                        type="date"
                        value={formDate}
                        onChange={e => setFormDate(e.target.value)}
                        className="pl-9 rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10 input-focus-ring"
                      />
                    </div>
                  </div>

                  {/* Mood Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-3.5 h-3.5 text-[#F9A8D4]" />
                        <span className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Mood</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{getMoodLabel(mood)}</span>
                        <motion.span
                          key={`mood-${mood}`}
                          variants={numberVariants}
                          initial="hidden"
                          animate="visible"
                          className="text-lg font-bold text-[#E8788A] w-6 text-right"
                        >
                          {mood}
                        </motion.span>
                      </div>
                    </div>
                    <Slider
                      value={[mood]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(val) => setMood(val[0])}
                      className="w-full [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-gradient-to-r [&_[data-slot=slider-track]]:from-[#F9D0DA] [&_[data-slot=slider-track]]:to-[#F9A8D4]/40 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#E8788A] [&_[data-slot=slider-range]]:to-[#F9A8D4] [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:border-[#E8788A] [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:shadow-[#E8788A]/20"
                    />
                  </div>

                  {/* Energy Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-[#F9A8D4]" />
                        <span className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Energy</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{getEnergyLabel(energy)}</span>
                        <motion.span
                          key={`energy-${energy}`}
                          variants={numberVariants}
                          initial="hidden"
                          animate="visible"
                          className="text-lg font-bold text-[#F9A8D4] w-6 text-right"
                        >
                          {energy}
                        </motion.span>
                      </div>
                    </div>
                    <Slider
                      value={[energy]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(val) => setEnergy(val[0])}
                      className="w-full [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-gradient-to-r [&_[data-slot=slider-track]]:from-[#F9D0DA] [&_[data-slot=slider-track]]:to-[#C084FC]/30 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#F9A8D4] [&_[data-slot=slider-range]]:to-[#C084FC] [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:border-[#F9A8D4] [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:shadow-[#F9A8D4]/20"
                    />
                  </div>

                  {/* Sleep Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon className="w-3.5 h-3.5 text-[#C084FC]" />
                        <span className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Sleep</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{getSleepLabel(sleep)}</span>
                        <motion.span
                          key={`sleep-${sleep}`}
                          variants={numberVariants}
                          initial="hidden"
                          animate="visible"
                          className="text-lg font-bold text-[#C084FC] w-6 text-right"
                        >
                          {sleep}
                        </motion.span>
                      </div>
                    </div>
                    <Slider
                      value={[sleep]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(val) => setSleep(val[0])}
                      className="w-full [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-gradient-to-r [&_[data-slot=slider-track]]:from-[#F9D0DA] [&_[data-slot=slider-track]]:to-[#C084FC]/20 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#C084FC] [&_[data-slot=slider-range]]:to-[#E8788A] [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:border-[#C084FC] [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:shadow-[#C084FC]/20"
                    />
                  </div>

                  {/* Stress Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-[#FDA4AF]" />
                        <span className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Stress</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{getStressLabel(stress)}</span>
                        <motion.span
                          key={`stress-${stress}`}
                          variants={numberVariants}
                          initial="hidden"
                          animate="visible"
                          className="text-lg font-bold text-[#FDA4AF] w-6 text-right"
                        >
                          {stress}
                        </motion.span>
                      </div>
                    </div>
                    <Slider
                      value={[stress]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(val) => setStress(val[0])}
                      className="w-full [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-gradient-to-r [&_[data-slot=slider-track]]:from-[#F9D0DA] [&_[data-slot=slider-track]]:to-[#FDA4AF]/30 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#FDA4AF] [&_[data-slot=slider-range]]:to-[#E8788A] [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:border-[#FDA4AF] [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:shadow-[#FDA4AF]/20"
                    />
                  </div>

                  {/* Pain Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-[#D4677A]" />
                        <span className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Pain</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{getPainLabel(pain)}</span>
                        <motion.span
                          key={`pain-${pain}`}
                          variants={numberVariants}
                          initial="hidden"
                          animate="visible"
                          className="text-lg font-bold text-[#D4677A] w-6 text-right"
                        >
                          {pain}
                        </motion.span>
                      </div>
                    </div>
                    <Slider
                      value={[pain]}
                      min={0}
                      max={10}
                      step={1}
                      onValueChange={(val) => setPain(val[0])}
                      className="w-full [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-gradient-to-r [&_[data-slot=slider-track]]:from-[#F9D0DA] [&_[data-slot=slider-track]]:to-[#D4677A]/20 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#D4677A] [&_[data-slot=slider-range]]:to-[#E8788A] [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:border-[#D4677A] [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:shadow-[#D4677A]/20"
                    />
                  </div>

                  {/* Water Intake & Exercise row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Water Intake */}
                    <div className="space-y-2">
                      <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-[#60A5FA]" />
                        Water Intake (glasses)
                      </Label>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setWaterIntake(Math.max(0, waterIntake - 1))}
                          className="h-8 w-8 p-0 rounded-lg border-[#F9D0DA] dark:border-[#4A2535] text-[#E8788A] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]"
                        >
                          -
                        </Button>
                        <motion.span
                          key={`water-${waterIntake}`}
                          variants={numberVariants}
                          initial="hidden"
                          animate="visible"
                          className="text-xl font-bold text-[#60A5FA] min-w-[2rem] text-center"
                        >
                          {waterIntake}
                        </motion.span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setWaterIntake(Math.min(20, waterIntake + 1))}
                          className="h-8 w-8 p-0 rounded-lg border-[#F9D0DA] dark:border-[#4A2535] text-[#E8788A] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Exercise */}
                    <div className="space-y-2">
                      <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium flex items-center gap-1.5">
                        <Dumbbell className="w-3.5 h-3.5 text-[#A78BFA]" />
                        Exercise
                      </Label>
                      <Select value={exercise} onValueChange={setExercise}>
                        <SelectTrigger className="w-full rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10">
                          <SelectValue placeholder="Select exercise" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535]">
                          {EXERCISE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-[#4A1D2E] dark:text-[#F9D0DA]">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-2">
                    <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
                      Weight (optional)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 65.5"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10 max-w-[200px] input-focus-ring"
                    />
                  </div>

                  {/* Symptoms Checkboxes */}
                  <div className="space-y-3">
                    <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Symptoms</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ALL_SYMPTOMS.map(symptom => (
                        <motion.label
                          key={symptom}
                          whileHover={{ scale: 1.02 }}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors border ${
                            selectedSymptoms.includes(symptom)
                              ? 'bg-[#FFF0F3] dark:bg-[#3A2030] border-[#E8788A]/40'
                              : 'bg-[#FFF5F7] border-[#F9D0DA]/40 dark:border-[#4A2535]/40 hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]/60'
                          }`}
                        >
                          <Checkbox
                            checked={selectedSymptoms.includes(symptom)}
                            onCheckedChange={() => toggleSymptom(symptom)}
                            className="data-[state=checked]:bg-[#E8788A] data-[state=checked]:border-[#E8788A]"
                          />
                          <span className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0]">{symptom}</span>
                        </motion.label>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
                      Notes
                    </Label>
                    <Textarea
                      placeholder="How are you feeling? Any additional observations..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] min-h-[80px] resize-y input-focus-ring"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <AnimatePresence mode="wait">
                      {saved ? (
                        <motion.div
                          key="saved"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5 text-[#E8788A] text-sm font-medium"
                        >
                          <Heart className="w-4 h-4" />
                          Entry Saved!
                        </motion.div>
                      ) : (
                        <motion.div key="save-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <Button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl px-6 py-2 text-sm font-medium shadow-sm shadow-[#E8788A]/20 h-auto btn-press"
                          >
                            {saving ? 'Saving...' : 'Save Entry'}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] hover:text-[#E8788A] h-auto py-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Reset
                    </Button>
                  </div>
                </motion.div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 3. Recent Entries List                                        */}
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
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Recent Entries</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Last {Math.min(10, logs.length)} health log entries</p>
              </div>
            </div>

            {recentLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F3] dark:bg-[#3A2030] flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-6 h-6 text-[#F9A8D4]" />
                </div>
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">No entries yet</p>
                <p className="text-xs text-[#9B6B7B]/70 mt-1">Create your first health log entry above to start tracking</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {recentLogs.map((log, i) => {
                  const isExpanded = expandedIds.has(log.id)
                  const logSymptoms = log.symptoms
                    ? log.symptoms.split(',').map(s => s.trim()).filter(Boolean)
                    : []

                  return (
                    <motion.div
                      key={log.id}
                      custom={i}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      className={`bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#FFF5F7]/40 dark:to-[#2A1520]/40 rounded-xl border border-[#F9D0DA]/30 dark:border-[#4A2535]/30 overflow-hidden glass-card-hover card-press ${i < 3 ? `fade-slide-in-${i + 1}` : ''}`}
                    >
                      {/* Collapsed view */}
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888] shrink-0" />
                            <span className="text-sm font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">
                              {formatShortDate(log.date)}
                            </span>
                            <Badge className="text-[9px] px-1.5 py-0 bg-gradient-to-r from-[#E8788A]/10 to-[#F9A8D4]/10 text-[#E8788A] dark:text-[#F0869A] border-0 rounded-md">Day {i + 1}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <ScorePill value={log.mood} label="Mood" color="#E8788A" />
                            <ScorePill value={log.energy} label="Energy" color="#F9A8D4" />
                            <ScorePill value={log.sleep} label="Sleep" color="#C084FC" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {logSymptoms.length > 0 && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-[#FFF0F3] dark:bg-[#3A2030] text-[#E8788A] border-0 rounded-md border border-[#F9D0DA]/50 dark:border-[#4A2535]/50">
                              {logSymptoms.length} {logSymptoms.length === 1 ? 'symptom' : 'symptoms'}
                            </Badge>
                          )}
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4 text-[#9B6B7B] dark:text-[#A07888]" />
                          </motion.div>
                        </div>
                      </button>

                      {/* Expanded view */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 border-t border-[#F9D0DA]/30 dark:border-[#4A2535]/30">
                              {/* All scores */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                                <div className="bg-[#FFF5F7] rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Stress</p>
                                  <p className="text-sm font-bold text-[#FDA4AF]">{log.stress}/10</p>
                                  <p className="text-[9px] text-[#9B6B7B]/70">{getStressLabel(log.stress)}</p>
                                </div>
                                <div className="bg-[#FFF5F7] rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Pain</p>
                                  <p className="text-sm font-bold text-[#D4677A]">{log.pain}/10</p>
                                  <p className="text-[9px] text-[#9B6B7B]/70">{getPainLabel(log.pain)}</p>
                                </div>
                                <div className="bg-[#FFF5F7] rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Water</p>
                                  <p className="text-sm font-bold text-[#60A5FA]">{log.waterIntake} glasses</p>
                                </div>
                              </div>

                              {/* Exercise & Weight */}
                              <div className="flex flex-wrap gap-3 mt-3">
                                {log.exercise && log.exercise !== 'none' && (
                                  <div className="flex items-center gap-1.5 text-xs text-[#6B3A4A] dark:text-[#C9A0B0]">
                                    <Dumbbell className="w-3 h-3 text-[#A78BFA]" />
                                    <span className="capitalize">{log.exercise.replace('-', ' ')}</span>
                                  </div>
                                )}
                                {log.weight > 0 && (
                                  <div className="flex items-center gap-1.5 text-xs text-[#6B3A4A] dark:text-[#C9A0B0]">
                                    <Scale className="w-3 h-3 text-[#9B6B7B] dark:text-[#A07888]" />
                                    <span>{log.weight} kg</span>
                                  </div>
                                )}
                              </div>

                              {/* Symptoms badges */}
                              {logSymptoms.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mb-1.5">Symptoms</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {logSymptoms.map(symptom => (
                                      <Badge
                                        key={symptom}
                                        className="text-[10px] px-2 py-0.5 border-0 rounded-lg"
                                        style={{
                                          backgroundColor: `${SYMPTOM_COLORS[symptom] || '#E8788A'}15`,
                                          color: SYMPTOM_COLORS[symptom] || '#E8788A',
                                        }}
                                      >
                                        {symptom}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              {log.notes && (
                                <div className="mt-3">
                                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mb-1">Notes</p>
                                  <p className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0] bg-[#FFF5F7] rounded-lg px-3 py-2">
                                    {log.notes}
                                  </p>
                                </div>
                              )}

                              {/* Delete button */}
                              <div className="flex justify-end mt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={deleting === log.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(log.id)
                                  }}
                                  className="text-[#9B6B7B] dark:text-[#A07888] hover:text-[#D4677A] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] h-7 text-xs rounded-lg px-2.5"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  {deleting === log.id ? 'Deleting...' : 'Delete'}
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 4. Symptom Frequency BarChart                                 */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={3} gradient="from-[#F9A8D4] via-[#C084FC] to-[#E8788A]" className="animated-gradient-border">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#C084FC]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Symptom Frequency</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">How often each symptom appears in your logs</p>
              </div>
            </div>

            {symptomFrequencyData.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] dark:bg-[#2A1A30] flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-[#C084FC]" />
                </div>
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">No symptom data yet</p>
                <p className="text-xs text-[#9B6B7B]/70 mt-1">Log symptoms in your entries to see frequency patterns</p>
              </div>
            ) : (
              <div className="h-[300px] sm:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={symptomFrequencyData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#F9D0DA"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#9B6B7B' }}
                      axisLine={{ stroke: '#F9D0DA' }}
                      tickLine={false}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9B6B7B' }}
                      axisLine={{ stroke: '#F9D0DA' }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#FFF0F3', radius: 8 }} />
                    <Bar
                      dataKey="count"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                    >
                      {symptomFrequencyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={SYMPTOM_COLORS[entry.name] || '#E8788A'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 5. Daily Patterns - 30-day averages                          */}
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
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#C084FC]/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Daily Patterns</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Your 30-day wellness averages</p>
              </div>
            </div>

            {!thirtyDayAverages ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F3] dark:bg-[#3A2030] flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-[#F9A8D4]" />
                </div>
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">Not enough data yet</p>
                <p className="text-xs text-[#9B6B7B]/70 mt-1">Keep logging to discover your daily patterns</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Entries count */}
                <div className="bg-gradient-to-r from-[#FFF0F3] to-[#F5F3FF] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#E8788A]" />
                      <span className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Entries in Last 30 Days</span>
                    </div>
                    <motion.span
                      custom={0}
                      variants={numberVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-2xl font-bold gradient-text-animated"
                    >
                      {thirtyDayAverages.count}
                    </motion.span>
                  </div>
                </div>

                {/* Score averages grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Average Mood */}
                  <div className="bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-4 text-center">
                    <Sun className="w-4 h-4 text-[#E8788A] mx-auto mb-1.5" />
                    <motion.p
                      custom={0}
                      variants={numberVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-2xl font-bold text-[#E8788A]"
                    >
                      {thirtyDayAverages.avgMood}
                    </motion.p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Avg Mood</p>
                    <div className="mt-2 h-1.5 bg-[#F9D0DA]/40 dark:bg-[#4A2535]/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${thirtyDayAverages.avgMood * 10}%` }}
                        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-[#E8788A] to-[#F9A8D4]"
                      />
                    </div>
                  </div>

                  {/* Average Energy */}
                  <div className="bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FDF2F8] dark:to-[#2A1520] rounded-xl p-4 text-center">
                    <Zap className="w-4 h-4 text-[#F9A8D4] mx-auto mb-1.5" />
                    <motion.p
                      custom={1}
                      variants={numberVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-2xl font-bold text-[#F9A8D4]"
                    >
                      {thirtyDayAverages.avgEnergy}
                    </motion.p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Avg Energy</p>
                    <div className="mt-2 h-1.5 bg-[#F9D0DA]/40 dark:bg-[#4A2535]/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${thirtyDayAverages.avgEnergy * 10}%` }}
                        transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-[#F9A8D4] to-[#C084FC]"
                      />
                    </div>
                  </div>

                  {/* Average Sleep */}
                  <div className="bg-gradient-to-br from-[#F5F3FF] dark:from-[#2A1A30] to-[#FDF2F8] dark:to-[#2A1520] rounded-xl p-4 text-center">
                    <Moon className="w-4 h-4 text-[#C084FC] mx-auto mb-1.5" />
                    <motion.p
                      custom={2}
                      variants={numberVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-2xl font-bold text-[#C084FC]"
                    >
                      {thirtyDayAverages.avgSleep}
                    </motion.p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Avg Sleep</p>
                    <div className="mt-2 h-1.5 bg-[#F9D0DA]/40 dark:bg-[#4A2535]/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${thirtyDayAverages.avgSleep * 10}%` }}
                        transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-[#C084FC] to-[#E8788A]"
                      />
                    </div>
                  </div>

                  {/* Average Stress */}
                  <div className="bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-4 text-center">
                    <Flame className="w-4 h-4 text-[#FDA4AF] mx-auto mb-1.5" />
                    <motion.p
                      custom={3}
                      variants={numberVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-2xl font-bold text-[#FDA4AF]"
                    >
                      {thirtyDayAverages.avgStress}
                    </motion.p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Avg Stress</p>
                    <div className="mt-2 h-1.5 bg-[#F9D0DA]/40 dark:bg-[#4A2535]/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${thirtyDayAverages.avgStress * 10}%` }}
                        transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-[#FDA4AF] to-[#E8788A]"
                      />
                    </div>
                  </div>

                  {/* Average Pain */}
                  <div className="bg-gradient-to-br from-[#FFF0F3] to-[#F5F3FF] rounded-xl p-4 text-center">
                    <AlertCircle className="w-4 h-4 text-[#D4677A] mx-auto mb-1.5" />
                    <motion.p
                      custom={4}
                      variants={numberVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-2xl font-bold text-[#D4677A]"
                    >
                      {thirtyDayAverages.avgPain}
                    </motion.p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Avg Pain</p>
                    <div className="mt-2 h-1.5 bg-[#F9D0DA]/40 dark:bg-[#4A2535]/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${thirtyDayAverages.avgPain * 10}%` }}
                        transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-[#D4677A] to-[#E8788A]"
                      />
                    </div>
                  </div>

                  {/* Average Water */}
                  <div className="bg-gradient-to-br from-[#EFF6FF] to-[#FDF2F8] rounded-xl p-4 text-center">
                    <Droplets className="w-4 h-4 text-[#60A5FA] mx-auto mb-1.5" />
                    <motion.p
                      custom={5}
                      variants={numberVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-2xl font-bold text-[#60A5FA]"
                    >
                      {thirtyDayAverages.avgWater}
                    </motion.p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5">Avg Water (glasses)</p>
                    <div className="mt-2 h-1.5 bg-[#DBEAFE]/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, thirtyDayAverages.avgWater * 5)}%` }}
                        transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#93C5FD]"
                      />
                    </div>
                  </div>
                </div>

                {/* Top exercise & average weight */}
                <div className="flex flex-wrap gap-3">
                  {thirtyDayAverages.topExercise && (
                    <div className="flex-1 min-w-[140px] bg-gradient-to-r from-[#F5F3FF] to-[#FFF5F7] rounded-xl p-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Dumbbell className="w-3.5 h-3.5 text-[#A78BFA]" />
                        <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Most Logged Exercise</span>
                      </div>
                      <p className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA] capitalize">
                        {thirtyDayAverages.topExercise.replace('-', ' ')}
                      </p>
                    </div>
                  )}
                  {thirtyDayAverages.avgWeight !== null && (
                    <div className="flex-1 min-w-[140px] bg-gradient-to-r from-[#FFF0F3] dark:from-[#3A2030] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Scale className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
                        <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Avg Weight</span>
                      </div>
                      <p className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{thirtyDayAverages.avgWeight} kg</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  )
}
