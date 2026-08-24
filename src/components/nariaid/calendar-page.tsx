'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isValid,
  differenceInDays,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Droplets,
  Heart,
  Stethoscope,
  Pill,
  Dumbbell,
  Sparkles,
  X,
  Clock,
  Trash2,
  AlertCircle,
  Moon,
  Sun,
  Flower2,
  Baby,
  Syringe,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarEventType {
  id: string
  title: string
  date: string
  endDate: string
  type: string
  notes: string
  color: string
  createdAt: string
  updatedAt: string
}

interface ProfileData {
  id: string
  name: string
  cycleLength: number
  lastPeriodStart: string
  age: number
  lifeStage: string
}

type DayMeta = {
  isPeriod: boolean
  isOvulation: boolean
  isPredicted: boolean
  phaseName: string
  phaseColor: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  { value: 'period', label: 'Period', icon: Droplets, color: '#E8788A' },
  { value: 'ovulation', label: 'Ovulation', icon: Flower2, color: '#C084FC' },
  { value: 'appointment', label: 'Appointment', icon: Stethoscope, color: '#7C3AED' },
  { value: 'symptom', label: 'Symptom', icon: AlertCircle, color: '#F9A8D4' },
  { value: 'medication', label: 'Medication', icon: Pill, color: '#A78BFA' },
  { value: 'exercise', label: 'Exercise', icon: Dumbbell, color: '#6EE7B7' },
  { value: 'other', label: 'Other', icon: Sparkles, color: '#FBBF24' },
] as const

const COLOR_PRESETS = [
  { name: 'Rose', value: '#E8788A' },
  { name: 'Pink', value: '#F9A8D4' },
  { name: 'Lavender', value: '#C084FC' },
  { name: 'Purple', value: '#A78BFA' },
  { name: 'Mint', value: '#6EE7B7' },
  { name: 'Peach', value: '#FDBA74' },
] as const

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 20,
    transition: { duration: 0.2, ease: 'easeIn' as any },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEventTypeConfig(type: string) {
  return EVENT_TYPES.find((t) => t.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1]
}

function calculateCycleDays(
  lastPeriodStart: string,
  cycleLength: number,
  rangeStart: Date,
  rangeEnd: Date
): Map<string, DayMeta> {
  const map = new Map<string, DayMeta>()

  if (!lastPeriodStart) return map

  const lastStart = parseISO(lastPeriodStart)
  if (!isValid(lastStart)) return map

  const periodDuration = 5
  const ovulationDay = 14

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

  for (const day of days) {
    const daysSinceStart = differenceInDays(day, lastStart)
    const cycleDay = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength + 1

    let isPeriod = false
    let isOvulation = false
    let phaseName = ''
    let phaseColor = ''

    if (cycleDay <= periodDuration) {
      isPeriod = true
      phaseName = 'Menstrual'
      phaseColor = '#E8788A'
    } else if (cycleDay <= 13) {
      phaseName = 'Follicular'
      phaseColor = '#F9A8D4'
    } else if (cycleDay <= 16) {
      isOvulation = cycleDay === ovulationDay
      phaseName = 'Ovulation'
      phaseColor = '#C084FC'
    } else {
      phaseName = 'Luteal'
      phaseColor = '#FDA4AF'
    }

    const key = format(day, 'yyyy-MM-dd')
    const isPredicted = daysSinceStart >= cycleLength

    map.set(key, { isPeriod, isOvulation, isPredicted, phaseName, phaseColor })
  }

  return map
}

function getPhaseForDate(date: Date, lastPeriodStart: string, cycleLength: number) {
  if (!lastPeriodStart) return null
  const lastStart = parseISO(lastPeriodStart)
  if (!isValid(lastStart)) return null

  const daysSinceStart = differenceInDays(date, lastStart)
  const cycleDay = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength + 1

  if (cycleDay <= 5) return { name: 'Menstrual', color: '#E8788A', icon: Moon }
  if (cycleDay <= 13) return { name: 'Follicular', color: '#F9A8D4', icon: Sun }
  if (cycleDay <= 16) return { name: 'Ovulation', color: '#C084FC', icon: Flower2 }
  return { name: 'Luteal', color: '#FDA4AF', icon: Baby }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const { userName } = useAppStore()

  // ---- State ----
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [events, setEvents] = useState<CalendarEventType[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Add event dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventType, setEventType] = useState('other')
  const [eventNotes, setEventNotes] = useState('')
  const [eventColor, setEventColor] = useState('#E8788A')
  const [saving, setSaving] = useState(false)

  // Cycle phase overlay toggle
  const [showCyclePhases, setShowCyclePhases] = useState(false)

  // ---- Fetch data ----
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [eventsRes, profileRes] = await Promise.all([
        fetch('/api/calendar-events'),
        fetch('/api/profile'),
      ])

      if (eventsRes.ok) {
        setEvents(await eventsRes.json())
      }
      if (profileRes.ok) {
        setProfile(await profileRes.json())
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---- Calendar computation ----
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)

  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: calStart, end: calEnd }),
    [calStart, calEnd]
  )

  const cycleDayMap = useMemo(
    () =>
      calculateCycleDays(
        profile?.lastPeriodStart ?? '',
        profile?.cycleLength ?? 28,
        calStart,
        addMonths(calEnd, 3)
      ),
    [profile?.lastPeriodStart, profile?.cycleLength, calStart, calEnd]
  )

  // ---- Events grouped by date ----
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventType[]>()
    for (const ev of events) {
      const key = ev.date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)

      // Also add to end date range if endDate exists
      if (ev.endDate && ev.endDate !== ev.date) {
        const startD = parseISO(ev.date)
        const endD = parseISO(ev.endDate)
        if (isValid(startD) && isValid(endD)) {
          const rangeDays = eachDayOfInterval({ start: startD, end: endD })
          for (const d of rangeDays) {
            const key2 = format(d, 'yyyy-MM-dd')
            if (key2 !== ev.date) {
              if (!map.has(key2)) map.set(key2, [])
              map.get(key2)!.push(ev)
            }
          }
        }
      }
    }
    return map
  }, [events])

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  const selectedDayEvents = eventsByDate.get(selectedDateKey) ?? []

  // ---- Handlers ----
  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
  }

  const openAddDialog = (date?: Date) => {
    const targetDate = date || selectedDate || new Date()
    setEventTitle('')
    setEventDate(format(targetDate, 'yyyy-MM-dd'))
    setEventEndDate('')
    setEventType('other')
    setEventNotes('')
    setEventColor('#E8788A')
    setDialogOpen(true)
  }

  const handleSaveEvent = async () => {
    if (!eventTitle.trim() || !eventDate) return

    setSaving(true)
    try {
      const res = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle.trim(),
          date: eventDate,
          endDate: eventEndDate || '',
          type: eventType,
          notes: eventNotes.trim(),
          color: eventColor,
        }),
      })

      if (res.ok) {
        const newEvent = await res.json()
        setEvents((prev) => [...prev, newEvent])
        setDialogOpen(false)
      }
    } catch (err) {
      console.error('Failed to save event:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar-events?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setEvents((prev) => prev.filter((ev) => ev.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete event:', err)
    }
  }

  // ---- Current cycle info for phase strip ----
  const todayPhase = getPhaseForDate(new Date(), profile?.lastPeriodStart ?? '', profile?.cycleLength ?? 28)

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0D12] px-4 py-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/60 dark:bg-[#2A1520]/60 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-[#F9D0DA]/40 dark:bg-[#4A2535]/40 rounded w-1/3 mb-4" />
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="h-10 bg-[#F9D0DA]/20 dark:bg-[#4A2535]/20 rounded-lg" />
                ))}
              </div>
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
        className="absolute top-[-60px] right-[-40px] w-[250px] h-[250px] rounded-full opacity-25 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #F9A8D4 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blob 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[300px] left-[-60px] w-[200px] h-[200px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 10s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute bottom-[200px] right-[-30px] w-[180px] h-[180px] rounded-full opacity-15 dark:opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #E8788A 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 12s ease-in-out infinite 4s',
        }}
      />

      {/* ================================================================ */}
      {/* Content                                                           */}
      {/* ================================================================ */}
      <div className="relative z-10 px-4 py-6 pb-24 max-w-2xl mx-auto space-y-5">

        {/* ============================================================ */}
        {/* 1. Gradient Header with Phase Strip                           */}
        {/* ============================================================ */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="relative rounded-2xl overflow-hidden"
        >
          {/* Background gradient */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 80% 10%, #F9A8D4 0%, transparent 50%), radial-gradient(ellipse at 20% 90%, #C084FC 0%, transparent 40%), radial-gradient(ellipse at 50% 50%, #E8788A 0%, transparent 30%)',
            }}
          />
          <div className="relative bg-white/70 dark:bg-[#2A1520]/70 backdrop-blur-md border border-[#F9D0DA]/50 dark:border-[#4A2535]/50 rounded-2xl px-6 py-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1">
                  {format(new Date(), 'EEEE, MMMM d')}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                  <span className="gradient-text-animated">Calendar</span>
                </h1>
                <p className="text-[#9B6B7B] dark:text-[#A07888] text-sm">
                  Track your cycle, events, and wellness journey
                </p>
              </div>
              <div className="shrink-0 ml-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] flex items-center justify-center shadow-lg shadow-[#E8788A]/15">
                  <CalendarDays className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            {/* Phase indicator strip */}
            {todayPhase && (
              <div className="flex items-center gap-2 mt-3 bg-white/60 dark:bg-[#2A1520]/60 rounded-xl px-4 py-2.5 border border-[#F9D0DA]/30 dark:border-[#4A2535]/30">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: todayPhase.color }}
                />
                <span className="text-sm font-medium" style={{ color: todayPhase.color }}>
                  {todayPhase.name} Phase
                </span>
                <span className="text-xs text-[#9B6B7B] dark:text-[#A07888] ml-1">Today</span>
                <div className="ml-auto flex items-center gap-1">
                  {[ 
                    { name: 'Mens.', color: '#E8788A' },
                    { name: 'Foll.', color: '#F9A8D4' },
                    { name: 'Ovul.', color: '#C084FC' },
                    { name: 'Luteal', color: '#FDA4AF' },
                  ].map((phase) => (
                    <div
                      key={phase.name}
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: phase.name === todayPhase.name ? '24px' : '8px',
                        backgroundColor: phase.name === todayPhase.name ? phase.color : `${phase.color}40`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 2. Month Calendar Grid                                        */}
        {/* ============================================================ */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.0 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
        >
          <div className="px-4 pt-5 pb-2 sm:px-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-5">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToPrevMonth}
                className="w-9 h-9 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030] flex items-center justify-center text-[#E8788A] hover:bg-[#F9D0DA]/40 dark:hover:bg-[#4A2535]/40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>

              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">
                  <span className="gradient-text-animated">{format(currentMonth, 'MMMM yyyy')}</span>
                </h2>
                {!isSameMonth(currentMonth, new Date()) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToToday}
                    className="text-xs font-medium text-[#E8788A] bg-[#FFF0F3] dark:bg-[#3A2030] px-2.5 py-1 rounded-lg hover:bg-[#F9D0DA]/40 dark:hover:bg-[#4A2535]/40 transition-colors"
                  >
                    Today
                  </motion.button>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToNextMonth}
                className="w-9 h-9 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030] flex items-center justify-center text-[#E8788A] hover:bg-[#F9D0DA]/40 dark:hover:bg-[#4A2535]/40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-[#9B6B7B] dark:text-[#A07888] py-1.5"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Show Cycle Phases toggle */}
            {profile?.lastPeriodStart && (
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Cycle Phases</span>
                  {showCyclePhases && (
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#FDDAE2]/70" /><span className="text-[9px] text-[#6B3A4A] dark:text-[#C9A0B0]">Mens.</span></span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#FCE7F3]/70" /><span className="text-[9px] text-[#6B3A4A] dark:text-[#C9A0B0]">Foll.</span></span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#F3E8FF]/70" /><span className="text-[9px] text-[#6B3A4A] dark:text-[#C9A0B0]">Ovul.</span></span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#FFF1F2]/70" /><span className="text-[9px] text-[#6B3A4A] dark:text-[#C9A0B0]">Luteal</span></span>
                    </div>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCyclePhases(!showCyclePhases)}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${showCyclePhases ? 'bg-gradient-to-r from-[#E8788A] to-[#F9A8D4]' : 'bg-[#F9D0DA] dark:bg-[#4A2535]'}`}
                >
                  <motion.span
                    animate={{ x: showCyclePhases ? 16 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                  />
                </motion.button>
              </div>
            )}

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const inMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)
                const selected = selectedDate ? isSameDay(day, selectedDate) : false
                const dayMeta = cycleDayMap.get(dateKey)
                const dayEvents = eventsByDate.get(dateKey) ?? []
                const isPeriod = dayMeta?.isPeriod ?? false
                const isOvulation = dayMeta?.isOvulation ?? false

                // Determine cell background
                let cellBg = 'bg-transparent'
                let cellHover = 'hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]'
                if (isPeriod && inMonth) {
                  cellBg = 'bg-[#FFF0F3] dark:bg-[#3A2030]'
                  cellHover = 'hover:bg-[#FDDAE2] dark:hover:bg-[#4A2535] dark:bg-[#4A2535]'
                } else if (isOvulation && inMonth) {
                  cellBg = 'bg-[#F5F3FF] dark:bg-[#2A1A30]'
                  cellHover = 'hover:bg-[#EDE9FE]'
                }

                // Cycle phase overlay colors (subtle tints)
                let phaseOverlayStyle: React.CSSProperties = {}
                let isPhaseBoundary = false
                if (showCyclePhases && inMonth && dayMeta) {
                  const phaseName = dayMeta.phaseName
                  // Check if this is a phase boundary (next day is different phase)
                  const nextDateKey = format(addDays(day, 1), 'yyyy-MM-dd')
                  const nextDayMeta = cycleDayMap.get(nextDateKey)
                  if (nextDayMeta && nextDayMeta.phaseName !== phaseName) {
                    isPhaseBoundary = true
                  }

                  switch (phaseName) {
                    case 'Menstrual':
                      phaseOverlayStyle = { backgroundColor: 'rgba(253, 218, 226, 0.3)' } // #FDDAE2/30%
                      break
                    case 'Follicular':
                      phaseOverlayStyle = { backgroundColor: 'rgba(252, 231, 243, 0.3)' } // #FCE7F3/30%
                      break
                    case 'Ovulation':
                      phaseOverlayStyle = { backgroundColor: 'rgba(243, 232, 255, 0.3)' } // #F3E8FF/30%
                      break
                    case 'Luteal':
                      phaseOverlayStyle = { backgroundColor: 'rgba(255, 241, 242, 0.3)' } // #FFF1F2/30%
                      break
                  }
                }

                return (
                  <motion.button
                    key={dateKey + idx}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative flex flex-col items-center justify-center
                      rounded-xl py-2 min-h-[52px] sm:min-h-[56px]
                      transition-colors duration-150 card-press
                      ${showCyclePhases && inMonth && dayMeta ? '' : `${cellBg} ${cellHover}`}
                      ${!inMonth ? 'opacity-30' : ''}
                      ${selected && inMonth ? 'ring-2 ring-[#E8788A]/40 dark:ring-[#F0869A]/40 ring-offset-1 ring-offset-white dark:ring-offset-[#1A0D12] date-pulse' : ''}
                    `}
                    style={showCyclePhases && inMonth && dayMeta ? phaseOverlayStyle : undefined}
                  >
                    {/* Phase boundary marker */}
                    {showCyclePhases && isPhaseBoundary && inMonth && dayMeta && (
                      <span
                        className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ backgroundColor: dayMeta.phaseColor }}
                      />
                    )}
                    {/* Day number */}
                    <span
                      className={`
                        text-sm font-medium leading-none
                        ${today ? 'text-white' : selected ? 'text-[#E8788A]' : inMonth ? 'text-[#4A1D2E] dark:text-[#F9D0DA]' : 'text-[#9B6B7B] dark:text-[#A07888]'}
                      `}
                    >
                      {today ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] text-white font-bold text-xs pulse-glow-shadow">
                          {format(day, 'd')}
                        </span>
                      ) : (
                        format(day, 'd')
                      )}
                    </span>

                    {/* Event/period dots */}
                    {(dayEvents.length > 0 || isPeriod || isOvulation) && inMonth && (
                      <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
                        {isPeriod && (
                          <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] shrink-0" />
                        )}
                        {isOvulation && (
                          <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#C084FC] to-[#D8B4FE] shrink-0" />
                        )}
                        {dayEvents.slice(0, 3).map((ev, i) => (
                          <span
                            key={ev.id + i}
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: ev.color || '#F9A8D4' }}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="w-1 h-1 rounded-full bg-[#9B6B7B] shrink-0" />
                        )}
                      </div>
                    )}

                    {/* Predicted indicator */}
                    {dayMeta?.isPredicted && isPeriod && inMonth && (
                      <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-[#F9A8D4]/60" />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 3. Event Type Legend                                          */}
        {/* ============================================================ */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 px-4 py-4 sm:px-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F9A8D4]/15 to-[#C084FC]/15 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[#F9A8D4]" />
            </div>
            <h3 className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Legend</h3>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {/* Period day indicator */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#FFF0F3] dark:bg-[#3A2030] border border-[#E8788A]/30" />
              <span className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0]">Period Day</span>
            </div>
            {/* Ovulation indicator */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#F5F3FF] dark:bg-[#2A1A30] border border-[#C084FC]/30" />
              <span className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0]">Ovulation Day</span>
            </div>
            {/* Predicted dot */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F9A8D4]/60" />
              <span className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0]">Predicted</span>
            </div>
            {/* Divider */}
            <div className="w-px h-4 bg-[#F9D0DA] self-center" />
            {/* Event types */}
            {EVENT_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <div key={type.value} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0]">{type.label}</span>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 4. Selected Day Events                                        */}
        {/* ============================================================ */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden glass-card-hover"
        >
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[#E8788A]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
                    {selectedDate
                      ? format(selectedDate, 'EEEE, MMMM d')
                      : 'Select a day'}
                  </h3>
                  {selectedDate && (
                    <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                      {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => openAddDialog()}
                className="bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl px-4 py-1.5 text-xs font-medium shadow-sm shadow-[#E8788A]/20 h-auto active:scale-95 transition-transform btn-press"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Event
              </Button>
            </div>

            {/* Cycle info for selected day */}
            {selectedDate && (() => {
              const selMeta = cycleDayMap.get(selectedDateKey)
              if (!selMeta) return null
              return (
                <div className="mb-3 flex items-center gap-2 bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#F5F3FF]/40 dark:to-[#2A1A30]/40 rounded-xl px-3.5 py-2.5 border border-[#F9D0DA]/30 dark:border-[#4A2535]/30">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: selMeta.phaseColor }}
                  />
                  <span className="text-xs font-medium" style={{ color: selMeta.phaseColor }}>
                    {selMeta.phaseName} Phase
                  </span>
                  {selMeta.isPeriod && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-[#E8788A]/10 text-[#E8788A] border-0 rounded-md">
                      Period
                    </Badge>
                  )}
                  {selMeta.isOvulation && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-[#C084FC]/10 text-[#C084FC] border-0 rounded-md">
                      Ovulation
                    </Badge>
                  )}
                  {selMeta.isPredicted && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-[#F9A8D4]/10 text-[#F9A8D4] border-0 rounded-md">
                      Predicted
                    </Badge>
                  )}
                </div>
              )
            })()}

            {/* Events list */}
            {selectedDate ? (
              selectedDayEvents.length > 0 ? (
                <ScrollArea className="max-h-64">
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2.5 pr-1"
                  >
                    {selectedDayEvents.map((ev) => {
                      const typeConfig = getEventTypeConfig(ev.type)
                      const Icon = typeConfig.icon
                      return (
                        <motion.div
                          key={ev.id}
                          variants={staggerItem}
                          whileHover={{ scale: 1.02 }}
                          className="flex items-start gap-3 bg-gradient-to-r from-[#FFF0F3]/40 dark:from-[#3A2030]/40 to-[#FFF5F7]/20 dark:to-[#2A1520]/20 rounded-xl p-3 group cursor-default border border-transparent hover:border-[#F9D0DA]/40 dark:border-[#4A2535]/40 transition-colors"
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: `${ev.color || typeConfig.color}15` }}
                          >
                            <Icon
                              className="w-4 h-4"
                              style={{ color: ev.color || typeConfig.color }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[#4A1D2E] dark:text-[#F9D0DA] truncate">
                                {ev.title}
                              </p>
                              <Badge
                                className="text-[9px] px-1.5 py-0 border-0 rounded-md shrink-0 capitalize"
                                style={{
                                  backgroundColor: `${ev.color || typeConfig.color}15`,
                                  color: ev.color || typeConfig.color,
                                }}
                              >
                                {ev.type}
                              </Badge>
                            </div>
                            {ev.endDate && ev.endDate !== ev.date && (
                              <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mt-0.5">
                                Until {format(parseISO(ev.endDate), 'MMM d')}
                              </p>
                            )}
                            {ev.notes && (
                              <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mt-0.5 line-clamp-2">
                                {ev.notes}
                              </p>
                            )}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#FEE2E2] dark:hover:bg-[#4A2020] text-[#9B6B7B] dark:text-[#A07888] hover:text-[#EF4444] transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF0F3] dark:bg-[#3A2030] flex items-center justify-center mx-auto mb-3">
                    <CalendarDays className="w-6 h-6 text-[#F9A8D4]" />
                  </div>
                  <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] mb-1">No events on this day</p>
                  <p className="text-xs text-[#9B6B7B]/70 mb-3">
                    Tap the button above to add one
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openAddDialog()}
                    className="text-xs font-medium text-[#E8788A] bg-[#FFF0F3] dark:bg-[#3A2030] px-3 py-1.5 rounded-lg hover:bg-[#F9D0DA]/40 dark:hover:bg-[#4A2535]/40 transition-colors"
                  >
                    Add your first event
                  </motion.button>
                </div>
              )
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">Click a day on the calendar to view events</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 5. Period Tracker Summary Card                                */}
        {/* ============================================================ */}
        {profile?.lastPeriodStart && (
          <motion.div
            custom={4}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-br from-[#E8788A] via-[#F9A8D4] to-[#C084FC]">
              <div className="bg-white rounded-[14px] px-4 py-5 sm:px-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#E8788A]/15 flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-[#C084FC]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Period Tracker</h3>
                    <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Predicted cycle for the next 3 months</p>
                  </div>
                </div>

                {/* Next period info */}
                {(() => {
                  const lastStart = parseISO(profile.lastPeriodStart)
                  if (!isValid(lastStart)) return null

                  const cycleLen = profile.cycleLength || 28
                  const today = new Date()
                  const daysSincePeriod = differenceInDays(today, lastStart)
                  const currentCycleDay = ((daysSincePeriod % cycleLen) + cycleLen) % cycleLen + 1
                  const nextPeriodDate = addDays(lastStart, cycleLen * (Math.floor(daysSincePeriod / cycleLen) + 1))
                  const daysUntilNext = Math.max(0, differenceInDays(nextPeriodDate, today))
                  const nextOvulationDate = addDays(nextPeriodDate, -14)

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-3.5">
                          <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1">Next Period</p>
                          <p className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
                            {format(nextPeriodDate, 'MMM d, yyyy')}
                          </p>
                          <p className="text-lg font-bold text-[#E8788A] mt-0.5">{daysUntilNext} days</p>
                        </div>
                        <div className="bg-gradient-to-br from-[#F5F3FF] dark:from-[#2A1A30] to-[#FDF2F8] dark:to-[#2A1520] rounded-xl p-3.5">
                          <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1">Next Ovulation</p>
                          <p className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
                            {format(nextOvulationDate, 'MMM d, yyyy')}
                          </p>
                          <p className="text-lg font-bold text-[#C084FC] mt-0.5">
                            {Math.max(0, differenceInDays(nextOvulationDate, today))} days
                          </p>
                        </div>
                      </div>

                      {/* Mini cycle visual */}
                      <div className="bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#F5F3FF]/40 dark:to-[#2A1A30]/40 rounded-xl p-3 border border-[#F9D0DA]/30 dark:border-[#4A2535]/30">
                        <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-2">Current Cycle Day {currentCycleDay} / {cycleLen}</p>
                        <div className="h-2.5 bg-white dark:bg-[#1A0D12] rounded-full overflow-hidden flex">
                          {Array.from({ length: cycleLen }).map((_, i) => {
                            const d = i + 1
                            let color = '#F9A8D4'
                            if (d <= 5) color = '#E8788A'
                            else if (d <= 13) color = '#F9A8D4'
                            else if (d <= 16) color = '#C084FC'
                            else color = '#FDA4AF'

                            return (
                              <div
                                key={i}
                                className="flex-1 transition-opacity"
                                style={{
                                  backgroundColor: color,
                                  opacity: d <= currentCycleDay ? 0.7 : 0.15,
                                }}
                              />
                            )
                          })}
                        </div>
                        {/* Phase labels with current position marker */}
                        <div className="relative mt-1">
                          <div className="flex justify-between">
                            <span className="text-[9px] text-[#E8788A]">Day 1</span>
                            <span className="text-[9px] text-[#C084FC]">Ovulation</span>
                            <span className="text-[9px] text-[#9B6B7B] dark:text-[#A07888]">Day {cycleLen}</span>
                          </div>
                          {/* Current day indicator on the bar */}
                          <div
                            className="absolute -top-[14px] flex flex-col items-center"
                            style={{ left: `${(currentCycleDay / cycleLen) * 100}%`, transform: 'translateX(-50%)' }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#E8788A] shadow-sm shadow-[#E8788A]/40" />
                          </div>
                        </div>
                        {/* Phase segments with labels */}
                        <div className="flex mt-2 gap-1">
                          <div className="flex items-center gap-1 flex-1">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#E8788A', opacity: 0.5 }} />
                            <span className="text-[8px] text-[#6B3A4A] dark:text-[#C9A0B0]">Menstrual</span>
                          </div>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#F9A8D4', opacity: 0.5 }} />
                            <span className="text-[8px] text-[#6B3A4A] dark:text-[#C9A0B0]">Follicular</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#C084FC', opacity: 0.5 }} />
                            <span className="text-[8px] text-[#6B3A4A] dark:text-[#C9A0B0]">Ovul.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#FDA4AF', opacity: 0.5 }} />
                            <span className="text-[8px] text-[#6B3A4A] dark:text-[#C9A0B0]">Luteal</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Add Event Dialog                                                 */}
      {/* ================================================================ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AnimatePresence>
          {dialogOpen && (
            <DialogContent
              className="sm:max-w-md bg-white border-[#F9D0DA]/60 dark:border-[#4A2535]/60 rounded-2xl p-0 overflow-hidden"
              showCloseButton={false}
            >
              <motion.div
                variants={dialogVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Dialog gradient header */}
                <div
                  className="relative px-6 pt-6 pb-4"
                  style={{
                    background: 'linear-gradient(135deg, #FFF0F3 0%, #F5F3FF 50%, #FFF0F3 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] flex items-center justify-center shadow-sm shadow-[#E8788A]/20">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                      <DialogTitle className="text-lg font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">
                        New Event
                      </DialogTitle>
                    </div>
                    <DialogClose asChild>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center text-[#9B6B7B] dark:text-[#A07888] hover:text-[#4A1D2E] dark:text-[#F9D0DA] hover:bg-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </DialogClose>
                  </div>
                  <DialogDescription className="text-xs text-[#9B6B7B] dark:text-[#A07888] mt-1 ml-[42px]">
                    Add an event to your calendar
                  </DialogDescription>
                </div>

                {/* Dialog form */}
                <div className="px-6 py-5 space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">
                      Title <span className="text-[#E8788A]">*</span>
                    </Label>
                    <Input
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g., Doctor appointment"
                      className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7]/50 dark:bg-[#2A1520]/50 text-sm focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 placeholder:text-[#C4A0AE] input-focus-ring"
                    />
                  </div>

                  {/* Date & End Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">
                        Date <span className="text-[#E8788A]">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7]/50 dark:bg-[#2A1520]/50 text-sm focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 input-focus-ring"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">
                        End Date
                      </Label>
                      <Input
                        type="date"
                        value={eventEndDate}
                        onChange={(e) => setEventEndDate(e.target.value)}
                        className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7]/50 dark:bg-[#2A1520]/50 text-sm focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 input-focus-ring"
                      />
                    </div>
                  </div>

                  {/* Event Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Event Type</Label>
                    <Select value={eventType} onValueChange={(val) => {
                      setEventType(val)
                      const config = getEventTypeConfig(val)
                      setEventColor(config.color)
                    }}>
                      <SelectTrigger className="w-full rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7]/50 dark:bg-[#2A1520]/50 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535]">
                        {EVENT_TYPES.map((type) => {
                          const Icon = type.icon
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: type.color }}
                                />
                                {type.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Color Picker */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Color</Label>
                    <div className="flex items-center gap-2">
                      {COLOR_PRESETS.map((preset) => (
                        <motion.button
                          key={preset.value}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setEventColor(preset.value)}
                          className={`
                            w-8 h-8 rounded-full transition-all duration-200
                            ${eventColor === preset.value ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1A0D12]' : ''}
                          `}
                          style={{
                            backgroundColor: preset.value,
                            '--tw-ring-color': eventColor === preset.value ? preset.value : 'transparent',
                          } as React.CSSProperties}
                          title={preset.name}
                        >
                          {eventColor === preset.value && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center justify-center w-full h-full"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </motion.span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Notes</Label>
                    <Textarea
                      value={eventNotes}
                      onChange={(e) => setEventNotes(e.target.value)}
                      placeholder="Any additional details..."
                      rows={3}
                      className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7]/50 dark:bg-[#2A1520]/50 text-sm focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 resize-none placeholder:text-[#C4A0AE] input-focus-ring"
                    />
                  </div>
                </div>

                {/* Dialog footer */}
                <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] text-[#6B3A4A] dark:text-[#C9A0B0] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] text-sm"
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      onClick={handleSaveEvent}
                      disabled={!eventTitle.trim() || !eventDate || saving}
                      className="bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl px-6 text-sm font-medium shadow-sm shadow-[#E8788A]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Event'}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </motion.div>
  )
}
