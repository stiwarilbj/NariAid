'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Heart,
  Pill,
  Dumbbell,
  Sparkles,
  Stethoscope,
  Tag,
  ChevronDown,
  CalendarClock,
  BarChart3,
  CheckCircle2,
  X,
  Timer,
  AlertCircle,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Reminder {
  id: string
  title: string
  description: string
  time: string
  frequency: string
  category: string
  active: boolean
  createdAt: string
  updatedAt: string
}

type Frequency = 'daily' | 'weekly' | 'monthly' | 'custom'
type Category = 'health' | 'medication' | 'exercise' | 'wellness' | 'appointment' | 'custom'

interface FormData {
  title: string
  description: string
  time: string
  frequency: Frequency
  category: Category
  customFrequency?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
]

const CATEGORIES: { value: Category; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'health', label: 'Health', icon: Heart, color: '#E8788A' },
  { value: 'medication', label: 'Medication', icon: Pill, color: '#C084FC' },
  { value: 'exercise', label: 'Exercise', icon: Dumbbell, color: '#F9A8D4' },
  { value: 'wellness', label: 'Wellness', icon: Sparkles, color: '#FDA4AF' },
  { value: 'appointment', label: 'Appointment', icon: Stethoscope, color: '#A78BFA' },
  { value: 'custom', label: 'Custom', icon: Tag, color: '#9B6B7B' },
]

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  time: '08:00',
  frequency: 'daily',
  category: 'health',
  customFrequency: '',
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

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
  exit: { opacity: 0, x: 12, scale: 0.95, transition: { duration: 0.25 } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryInfo(category: string) {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[5]
}

function formatTime(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function getFrequencyLabel(freq: string): string {
  return FREQUENCIES.find((f) => f.value === freq)?.label || freq
}

function timeToMinutes(time: string): number {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// ---------------------------------------------------------------------------
// Gradient Border Card
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
// Main Reminders Component
// ---------------------------------------------------------------------------

export default function Reminders() {
  const { userName } = useAppStore()

  // ---- State ----
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ---- Fetch reminders ----
  const fetchReminders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reminders')
      if (res.ok) {
        const data = await res.json()
        setReminders(data)
      }
    } catch (err) {
      console.error('Failed to fetch reminders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  // ---- Form handlers ----
  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
  }, [])

  const openAddForm = useCallback(() => {
    resetForm()
    setShowForm(true)
  }, [resetForm])

  const openEditForm = useCallback((reminder: Reminder) => {
    setFormData({
      title: reminder.title,
      description: reminder.description,
      time: reminder.time,
      frequency: reminder.frequency as Frequency,
      category: reminder.category as Category,
      customFrequency: '',
    })
    setEditingId(reminder.id)
    setShowForm(true)
    setFormError('')
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    resetForm()
  }, [resetForm])

  const validateForm = useCallback((): string => {
    if (!formData.title.trim()) return 'Title is required'
    if (!formData.time) return 'Time is required'
    if (formData.frequency === 'custom' && !formData.customFrequency?.trim())
      return 'Please specify custom frequency'
    return ''
  }, [formData])

  const handleSubmit = useCallback(async () => {
    const error = validateForm()
    if (error) {
      setFormError(error)
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        time: formData.time,
        frequency:
          formData.frequency === 'custom'
            ? formData.customFrequency!.trim()
            : formData.frequency,
        category: formData.category,
        active: true,
      }

      if (editingId) {
        const res = await fetch('/api/reminders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
        if (!res.ok) throw new Error('Update failed')
      } else {
        const res = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Create failed')
      }

      await fetchReminders()
      closeForm()
    } catch (err) {
      console.error('Failed to save reminder:', err)
      setFormError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [formData, editingId, validateForm, fetchReminders, closeForm])

  // ---- Toggle active/inactive ----
  const toggleActive = useCallback(
    async (id: string, currentActive: boolean) => {
      try {
        const res = await fetch('/api/reminders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, active: !currentActive }),
        })
        if (res.ok) {
          setReminders((prev) =>
            prev.map((r) => (r.id === id ? { ...r, active: !currentActive } : r))
          )
        }
      } catch (err) {
        console.error('Failed to toggle reminder:', err)
      }
    },
    []
  )

  // ---- Delete ----
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
          setReminders((prev) => prev.filter((r) => r.id !== id))
          setDeleteConfirmId(null)
        }
      } catch (err) {
        console.error('Failed to delete reminder:', err)
      }
    },
    []
  )

  // ---- Derived data ----
  const filteredReminders =
    selectedCategory === 'all'
      ? reminders
      : reminders.filter((r) => r.category === selectedCategory)

  const activeReminders = reminders.filter((r) => r.active)

  const upcomingReminders = [...activeReminders]
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
    .slice(0, 5)

  // Stats
  const totalActive = activeReminders.length
  const categoryBreakdown = CATEGORIES.map((cat) => ({
    ...cat,
    count: activeReminders.filter((r) => r.category === cat.value).length,
  })).filter((c) => c.count > 0)

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
      {/* ================================================================== */}
      {/* Decorative gradient blobs                                           */}
      {/* ================================================================== */}
      <div
        className="absolute top-[-80px] right-[-60px] w-[280px] h-[280px] rounded-full opacity-30 dark:opacity-15 dark:opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #F9A8D4 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blob 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[200px] left-[-80px] w-[220px] h-[220px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 10s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute bottom-[300px] right-[-40px] w-[200px] h-[200px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #E8788A 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 12s ease-in-out infinite 4s',
        }}
      />

      {/* ================================================================== */}
      {/* Content                                                             */}
      {/* ================================================================== */}
      <div className="relative z-10 px-4 py-6 pb-24 max-w-2xl mx-auto space-y-5">
        {/* ============================================================== */}
        {/* 1. Header                                                       */}
        {/* ============================================================== */}
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
                'radial-gradient(ellipse at 70% 20%, #F9A8D4 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, #C084FC 0%, transparent 50%)',
            }}
          />
          <div className="relative bg-white/70 dark:bg-[#2A1520]/70 backdrop-blur-md border border-[#F9D0DA]/50 dark:border-[#4A2535]/50 rounded-2xl px-6 py-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1">Your Reminders</p>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                  Stay on{' '}
                  <span className="gradient-text-animated">Track</span>
                </h1>
                <p className="text-[#9B6B7B] dark:text-[#A07888] text-sm">
                  {totalActive} active reminder{totalActive !== 1 ? 's' : ''} keeping you healthy
                </p>
              </div>
              <div className="shrink-0 ml-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] flex items-center justify-center shadow-lg shadow-[#E8788A]/15">
                  <Bell className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/* 2. Statistics Card                                              */}
        {/* ============================================================== */}
        <GradientBorderCard
          animateIndex={1}
          gradient="from-[#E8788A] via-[#F9A8D4] to-[#C084FC]"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Reminder Statistics</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Overview of your health routines</p>
              </div>
            </div>

            {/* Total active big number */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 bg-gradient-to-br from-[#FFF0F3] dark:from-[#3A2030] to-[#FFF5F7] dark:to-[#2A1520] rounded-xl p-4 text-center">
                <motion.p
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number], delay: 0.3 }}
                  className="text-4xl font-bold gradient-text-animated"
                >
                  {totalActive}
                </motion.p>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mt-1">Active Reminders</p>
              </div>
              <div className="flex-1 bg-gradient-to-br from-[#F5F3FF] to-[#FFF5F7] rounded-xl p-4 text-center">
                <motion.p
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number], delay: 0.4 }}
                  className="text-4xl font-bold text-[#C084FC]"
                >
                  {reminders.length}
                </motion.p>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mt-1">Total Created</p>
              </div>
            </div>

            {/* Category breakdown */}
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-[#9B6B7B] dark:text-[#A07888] uppercase tracking-wider">
                  By Category
                </p>
                <div className="space-y-2">
                  {categoryBreakdown.map((cat) => {
                    const Icon = cat.icon
                    const percentage =
                      totalActive > 0 ? Math.round((cat.count / totalActive) * 100) : 0
                    return (
                      <div key={cat.value} className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}15` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">{cat.label}</span>
                            <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                              {cat.count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#FFF0F3] dark:bg-[#3A2030] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                              className="h-full rounded-full"
                              style={{
                                background: `linear-gradient(to right, ${cat.color}, ${cat.color}88)`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">No active reminders yet</p>
                <p className="text-xs text-[#9B6B7B]/70 mt-1">
                  Add your first reminder to see statistics
                </p>
              </div>
            )}
          </div>
        </GradientBorderCard>

        {/* ============================================================== */}
        {/* 3. Upcoming Reminders Section                                   */}
        {/* ============================================================== */}
        {upcomingReminders.length > 0 && (
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
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-[#C084FC]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Upcoming</h2>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Next reminders due today</p>
                </div>
              </div>

              <div className="space-y-2">
                {upcomingReminders.map((reminder, i) => {
                  const catInfo = getCategoryInfo(reminder.category)
                  const Icon = catInfo.icon
                  const now = new Date()
                  const [h, m] = reminder.time.split(':').map(Number)
                  const reminderMinutes = (h || 0) * 60 + (m || 0)
                  const nowMinutes = now.getHours() * 60 + now.getMinutes()
                  const isPast = reminderMinutes < nowMinutes
                  const isNext =
                    !isPast &&
                    upcomingReminders.filter(
                      (r) => timeToMinutes(r.time) >= nowMinutes
                    )[0]?.id === reminder.id

                  return (
                    <motion.div
                      key={reminder.id}
                      custom={i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                        isNext
                          ? 'bg-gradient-to-r from-[#E8788A]/8 dark:from-[#E8788A]/12 to-[#F9A8D4]/8 dark:to-[#F9A8D4]/12 ring-1 ring-[#E8788A]/20'
                          : isPast
                          ? 'bg-[#FFF5F7]/50 dark:bg-[#2A1520]/50 opacity-60'
                          : 'bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#FFF5F7]/40 dark:to-[#2A1520]/40'
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${catInfo.color}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: catInfo.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#4A1D2E] dark:text-[#F9D0DA] truncate">
                          {reminder.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-[#9B6B7B] dark:text-[#A07888]" />
                          <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                            {formatTime(reminder.time)}
                          </span>
                          {isNext && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-[#E8788A]/10 text-[#E8788A] border-0 rounded-md">
                              NEXT
                            </Badge>
                          )}
                          {isPast && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-[#9B6B7B]/10 text-[#9B6B7B] dark:text-[#A07888] border-0 rounded-md">
                              PASSED
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 bg-[#FFF0F3] dark:bg-[#3A2030] text-[#9B6B7B] dark:text-[#A07888] border-0 rounded-md capitalize shrink-0"
                      >
                        {getFrequencyLabel(reminder.frequency)}
                      </Badge>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* 4. Add Reminder Button + Category Filter                        */}
        {/* ============================================================== */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {/* Add button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={openAddForm}
              className="w-full bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-2xl px-6 py-6 text-sm font-semibold shadow-lg shadow-[#E8788A]/15 h-auto pulse-glow-shadow btn-press"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Reminder
            </Button>
          </motion.div>

          {/* Category filter pills */}
          <div className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 px-4 py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <ChevronDown className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
              <span className="text-xs font-medium text-[#9B6B7B] dark:text-[#A07888] uppercase tracking-wider">
                Filter by Category
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 btn-press ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-[#E8788A] to-[#F9A8D4] text-white shadow-sm shadow-[#E8788A]/20'
                    : 'bg-[#FFF0F3] dark:bg-[#3A2030] text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#F9D0DA]/40 dark:hover:bg-[#4A2535]/40'
                }`}
              >
                All
              </motion.button>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isActive = selectedCategory === cat.value
                return (
                  <motion.button
                    key={cat.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 btn-press ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 'bg-[#FFF0F3] dark:bg-[#3A2030] hover:bg-[#F9D0DA]/40 dark:hover:bg-[#4A2535]/40'
                    }`}
                    style={
                      isActive
                        ? {
                            background: `linear-gradient(to right, ${cat.color}, ${cat.color}cc)`,
                            boxShadow: `0 2px 8px ${cat.color}33`,
                          }
                        : { color: cat.color }
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <Icon className="w-3 h-3" />
                    {cat.label}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/* 5. Active Reminders List                                        */}
        {/* ============================================================== */}
        <motion.div
          custom={4}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <Timer className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Your Reminders</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                  {filteredReminders.length} reminder{filteredReminders.length !== 1 ? 's' : ''}
                  {selectedCategory !== 'all' && ` in ${getCategoryInfo(selectedCategory).label}`}
                </p>
              </div>
            </div>

            {filteredReminders.length > 0 ? (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-2.5 max-h-96 overflow-y-auto pr-1"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#F9D0DA transparent',
                }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredReminders.map((reminder, i) => {
                    const catInfo = getCategoryInfo(reminder.category)
                    const Icon = catInfo.icon
                    return (
                      <motion.div
                        key={reminder.id}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        whileHover={{ scale: 1.01 }}
                        className={`flex items-center gap-3 rounded-xl p-3 transition-all duration-200 ${
                          reminder.active
                            ? 'bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#FFF5F7]/40 dark:to-[#2A1520]/40 glass-card-hover card-press'
                            : 'bg-[#F9F9F9] dark:bg-[#1A0D12]/60 opacity-60'
                        }`}
                      >
                        {/* Category icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: reminder.active
                              ? `${catInfo.color}15`
                              : `${catInfo.color}08`,
                          }}
                        >
                          <Icon
                            className="w-4.5 h-4.5"
                            style={{ color: reminder.active ? catInfo.color : '#9B6B7B' }}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              reminder.active ? 'text-[#4A1D2E] dark:text-[#F9D0DA]' : 'text-[#9B6B7B] dark:text-[#A07888] line-through'
                            }`}
                          >
                            {reminder.title}
                          </p>
                          {reminder.description && (
                            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] truncate mt-0.5">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-[#9B6B7B] dark:text-[#A07888]" />
                            <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                              {formatTime(reminder.time)}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 bg-[#FFF0F3] dark:bg-[#3A2030] text-[#9B6B7B] dark:text-[#A07888] border-0 rounded-md capitalize"
                            >
                              {getFrequencyLabel(reminder.frequency)}
                            </Badge>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Toggle switch */}
                          <Switch
                            checked={reminder.active}
                            onCheckedChange={() => toggleActive(reminder.id, reminder.active)}
                            className="data-[state=checked]:bg-[#E8788A] data-[state=unchecked]:bg-[#D1D5DB]"
                          />

                          {/* Edit button */}
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditForm(reminder)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] transition-colors"
                            aria-label="Edit reminder"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
                          </motion.button>

                          {/* Delete button */}
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setDeleteConfirmId(reminder.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#FEE2E2] dark:hover:bg-[#4A2020] transition-colors"
                            aria-label="Delete reminder"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#D1A0A0] hover:text-[#E8788A]" />
                          </motion.button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F3] dark:bg-[#3A2030] flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-[#F9A8D4]" />
                </div>
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] mb-1">
                  {selectedCategory === 'all'
                    ? 'No reminders yet'
                    : `No ${getCategoryInfo(selectedCategory).label} reminders`}
                </p>
                <p className="text-xs text-[#9B6B7B]/70">
                  Tap the button above to create your first reminder
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/* Add/Edit Reminder Dialog                                        */}
        {/* ============================================================== */}
        <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
          <DialogContent className="bg-white dark:bg-[#2A1520] border-[#F9D0DA] dark:border-[#4A2535] rounded-2xl max-w-md mx-auto p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="text-lg font-semibold text-[#4A1D2E] dark:text-[#F9D0DA] flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                  {editingId ? (
                    <Pencil className="w-4 h-4 text-[#E8788A]" />
                  ) : (
                    <Plus className="w-4 h-4 text-[#E8788A]" />
                  )}
                </div>
                {editingId ? 'Edit Reminder' : 'New Reminder'}
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 py-4 space-y-4">
              {/* Error message */}
              <AnimatePresence>
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 bg-[#FEE2E2]/60 text-[#DC2626] rounded-xl px-3 py-2.5 text-xs"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Take prenatal vitamins"
                  className="border-[#F9D0DA] dark:border-[#4A2535] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 rounded-xl text-sm h-10 placeholder:text-[#C4A0AD] dark:placeholder:text-[#7B5A6A] input-focus-ring"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Additional details (optional)"
                  className="border-[#F9D0DA] dark:border-[#4A2535] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 rounded-xl text-sm min-h-[72px] resize-none placeholder:text-[#C4A0AD] dark:placeholder:text-[#7B5A6A] input-focus-ring"
                />
              </div>

              {/* Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B6B7B] dark:text-[#A07888]" />
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                    className="border-[#F9D0DA] dark:border-[#4A2535] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 rounded-xl text-sm h-10 pl-9 input-focus-ring"
                  />
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, frequency: val as Frequency }))
                  }
                >
                  <SelectTrigger className="border-[#F9D0DA] dark:border-[#4A2535] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 rounded-xl text-sm h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#F9D0DA] dark:border-[#4A2535] rounded-xl">
                    {FREQUENCIES.map((freq) => (
                      <SelectItem
                        key={freq.value}
                        value={freq.value}
                        className="focus:bg-[#FFF0F3] dark:bg-[#3A2030] focus:text-[#E8788A]"
                      >
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom frequency input */}
              <AnimatePresence>
                {formData.frequency === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">
                      Custom Frequency
                    </Label>
                    <Input
                      value={formData.customFrequency || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customFrequency: e.target.value }))
                      }
                      placeholder="e.g., Every 3 days, Twice a week"
                      className="border-[#F9D0DA] dark:border-[#4A2535] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 rounded-xl text-sm h-10 placeholder:text-[#C4A0AD] dark:placeholder:text-[#7B5A6A] input-focus-ring"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B3A4A] dark:text-[#C9A0B0]">Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    const isSelected = formData.category === cat.value
                    return (
                      <motion.button
                        key={cat.value}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, category: cat.value }))
                        }
                        className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all duration-200 border ${
                          isSelected
                            ? 'text-white shadow-sm'
                            : 'border-[#F9D0DA]/60 dark:border-[#4A2535]/60 text-[#9B6B7B] dark:text-[#A07888] hover:border-[#F9D0DA] dark:border-[#4A2535] bg-white'
                        }`}
                        style={
                          isSelected
                            ? {
                                background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)`,
                                borderColor: 'transparent',
                                boxShadow: `0 2px 8px ${cat.color}33`,
                              }
                            : {}
                        }
                      >
                        <Icon className="w-4 h-4" />
                        {cat.label}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="px-6 py-4 border-t border-[#F9D0DA]/40 dark:border-[#4A2535]/40 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={closeForm}
                className="flex-1 border-[#F9D0DA] dark:border-[#4A2535] text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] hover:text-[#6B3A4A] dark:text-[#C9A0B0] rounded-xl h-10"
              >
                Cancel
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl h-10 shadow-sm shadow-[#E8788A]/20"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-4 h-4" />
                      </motion.span>
                      Saving...
                    </span>
                  ) : editingId ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Update
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Create
                    </span>
                  )}
                </Button>
              </motion.div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ============================================================== */}
        {/* Delete Confirmation Dialog                                      */}
        {/* ============================================================== */}
        <Dialog
          open={deleteConfirmId !== null}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        >
          <DialogContent className="bg-white dark:bg-[#2A1520] border-[#F9D0DA] dark:border-[#4A2535] rounded-2xl max-w-xs mx-auto p-0 overflow-hidden">
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2]/60 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-[#E8788A]" />
              </div>
              <h3 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA] mb-1">Delete Reminder</h3>
              <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                This action cannot be undone. Are you sure you want to delete this reminder?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#F9D0DA]/40 dark:border-[#4A2535]/40 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 border-[#F9D0DA] dark:border-[#4A2535] text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] hover:text-[#6B3A4A] dark:text-[#C9A0B0] rounded-xl h-10"
              >
                Cancel
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                  className="w-full bg-[#E8788A] hover:bg-[#D66A7C] text-white border-0 rounded-xl h-10"
                >
                  Delete
                </Button>
              </motion.div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  )
}
