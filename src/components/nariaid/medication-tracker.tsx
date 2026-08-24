'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pill, Clock, Plus, Check, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Frequency = 'daily' | 'twice_daily' | 'as_needed' | 'weekly'

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: Frequency
  times: string[] // e.g. ['08:00'] or ['08:00', '20:00']
  takenToday: boolean[] // parallel to times array
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
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
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
}

const checkVariants = {
  unchecked: { scale: 1 },
  checked: {
    scale: [1, 1.25, 0.95, 1.05, 1],
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
  },
}

// ---------------------------------------------------------------------------
// Default sample data
// ---------------------------------------------------------------------------

const defaultMedications: Medication[] = [
  {
    id: 'med-1',
    name: 'Prenatal Vitamin',
    dosage: '1 tablet',
    frequency: 'daily',
    times: ['08:00'],
    takenToday: [false],
  },
  {
    id: 'med-2',
    name: 'Iron Supplement',
    dosage: '65mg',
    frequency: 'daily',
    times: ['20:00'],
    takenToday: [false],
  },
  {
    id: 'med-3',
    name: 'Vitamin D',
    dosage: '2000 IU',
    frequency: 'daily',
    times: ['09:00'],
    takenToday: [false],
  },
  {
    id: 'med-4',
    name: 'Omega-3',
    dosage: '1000mg',
    frequency: 'twice_daily',
    times: ['08:00', '20:00'],
    takenToday: [false, false],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function getFrequencyLabel(freq: Frequency): string {
  switch (freq) {
    case 'daily':
      return 'Daily'
    case 'twice_daily':
      return 'Twice Daily'
    case 'as_needed':
      return 'As Needed'
    case 'weekly':
      return 'Weekly'
  }
}

function getCurrentTimeMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
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
      whileHover={{ scale: 1.01 }}
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
// Circular Progress Ring
// ---------------------------------------------------------------------------

function ProgressRing({
  taken,
  total,
  size = 80,
  strokeWidth = 6,
}: {
  taken: number
  total: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? taken / total : 0
  const offset = circumference - progress * circumference
  const center = size / 2
  const gradientId = 'med-ring-gradient'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8788A" />
            <stop offset="50%" stopColor="#F9A8D4" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[#F9D0DA]/40 dark:text-[#4A2535]/40"
        />
        {/* Progress ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={taken}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
          className="text-lg font-bold gradient-text"
        >
          {taken}/{total}
        </motion.span>
        <span className="text-[9px] text-[#9B6B7B] dark:text-[#A07888] -mt-0.5">taken</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Medication Form
// ---------------------------------------------------------------------------

function AddMedicationForm({ onAdd, onCancel }: { onAdd: (med: Omit<Medication, 'id'>) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [time1, setTime1] = useState('08:00')
  const [time2, setTime2] = useState('20:00')

  const handleSubmit = () => {
    if (!name.trim() || !dosage.trim()) return

    const times: string[] = frequency === 'twice_daily' ? [time1, time2] : [time1]
    const takenToday = times.map(() => false)

    onAdd({
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      times,
      takenToday,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      className="overflow-hidden"
    >
      <div className="mt-4 pt-4 border-t border-[#F9D0DA]/60 dark:border-[#4A2535]/60 space-y-3">
        <p className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Add Medication</p>

        {/* Name */}
        <div>
          <label className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1 block">Medication Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Prenatal Vitamin"
            className="w-full bg-[#FFF5F7] dark:bg-[#1A0D12] border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 rounded-xl px-3 py-2 text-sm text-[#4A1D2E] dark:text-[#F9D0DA] placeholder:text-[#9B6B7B]/50 dark:placeholder:text-[#A07888]/50 focus:outline-none focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-1 focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 transition-colors"
          />
        </div>

        {/* Dosage */}
        <div>
          <label className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1 block">Dosage</label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 500mg, 1 tablet"
            className="w-full bg-[#FFF5F7] dark:bg-[#1A0D12] border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 rounded-xl px-3 py-2 text-sm text-[#4A1D2E] dark:text-[#F9D0DA] placeholder:text-[#9B6B7B]/50 dark:placeholder:text-[#A07888]/50 focus:outline-none focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-1 focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 transition-colors"
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1 block">Frequency</label>
          <div className="flex flex-wrap gap-2">
            {(['daily', 'twice_daily', 'as_needed', 'weekly'] as Frequency[]).map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  frequency === freq
                    ? 'bg-gradient-to-r from-[#E8788A] to-[#F9A8D4] text-white shadow-sm shadow-[#E8788A]/20'
                    : 'bg-[#FFF0F3] dark:bg-[#3A2030] text-[#9B6B7B] dark:text-[#A07888] border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 hover:bg-[#FFE0E8] dark:hover:bg-[#4A2535]'
                }`}
              >
                {getFrequencyLabel(freq)}
              </button>
            ))}
          </div>
        </div>

        {/* Time inputs */}
        <div className={`flex gap-3 ${frequency === 'twice_daily' ? '' : ''}`}>
          <div className="flex-1">
            <label className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1 block">
              {frequency === 'twice_daily' ? 'Morning Time' : frequency === 'weekly' ? 'Day & Time' : 'Time'}
            </label>
            <input
              type="time"
              value={time1}
              onChange={(e) => setTime1(e.target.value)}
              className="w-full bg-[#FFF5F7] dark:bg-[#1A0D12] border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 rounded-xl px-3 py-2 text-sm text-[#4A1D2E] dark:text-[#F9D0DA] focus:outline-none focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-1 focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 transition-colors"
            />
          </div>
          {frequency === 'twice_daily' && (
            <div className="flex-1">
              <label className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1 block">Evening Time</label>
              <input
                type="time"
                value={time2}
                onChange={(e) => setTime2(e.target.value)}
                className="w-full bg-[#FFF5F7] dark:bg-[#1A0D12] border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 rounded-xl px-3 py-2 text-sm text-[#4A1D2E] dark:text-[#F9D0DA] focus:outline-none focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-1 focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] h-8 px-4 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || !dosage.trim()}
            className="bg-gradient-to-r from-[#E8788A] to-[#F9A8D4] hover:from-[#D66A7C] hover:to-[#E8A0D4] text-white border-0 rounded-xl px-4 h-8 text-xs font-medium shadow-sm shadow-[#E8788A]/20 disabled:opacity-50 btn-press"
          >
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main MedicationTracker Component
// ---------------------------------------------------------------------------

export default function MedicationTracker() {
  const [medications, setMedications] = useState<Medication[]>(defaultMedications)
  const [showForm, setShowForm] = useState(false)
  const [justChecked, setJustChecked] = useState<string | null>(null)

  // Calculate progress
  const { totalDoses, takenDoses } = useMemo(() => {
    let total = 0
    let taken = 0
    medications.forEach((med) => {
      total += med.takenToday.length
      taken += med.takenToday.filter(Boolean).length
    })
    return { totalDoses: total, takenDoses: taken }
  }, [medications])

  const progressPct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0

  // Sort medications: upcoming first (closest to now, not yet taken), then taken
  const nowMinutes = getCurrentTimeMinutes()
  const sortedMedications = useMemo(() => {
    return [...medications].sort((a, b) => {
      const aAllTaken = a.takenToday.every(Boolean)
      const bAllTaken = b.takenToday.every(Boolean)
      if (aAllTaken !== bAllTaken) return aAllTaken ? 1 : -1

      // Find the nearest not-taken time
      const aNearestTime = a.times.reduce((nearest, time, idx) => {
        if (a.takenToday[idx]) return nearest
        const mins = timeToMinutes(time)
        if (nearest === -1) return mins
        return Math.abs(mins - nowMinutes) < Math.abs(nearest - nowMinutes) ? mins : nearest
      }, -1)
      const bNearestTime = b.times.reduce((nearest, time, idx) => {
        if (b.takenToday[idx]) return nearest
        const mins = timeToMinutes(time)
        if (nearest === -1) return mins
        return Math.abs(mins - nowMinutes) < Math.abs(nearest - nowMinutes) ? mins : nearest
      }, -1)

      if (aNearestTime === -1 && bNearestTime === -1) return 0
      if (aNearestTime === -1) return 1
      if (bNearestTime === -1) return -1
      return Math.abs(aNearestTime - nowMinutes) - Math.abs(bNearestTime - nowMinutes)
    })
  }, [medications, nowMinutes])

  // Toggle medication taken status
  const toggleTaken = (medId: string, timeIndex: number) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id !== medId) return med
        const newTaken = [...med.takenToday]
        newTaken[timeIndex] = !newTaken[timeIndex]
        return { ...med, takenToday: newTaken }
      })
    )
    // Trigger check animation
    const med = medications.find((m) => m.id === medId)
    if (med && !med.takenToday[timeIndex]) {
      setJustChecked(`${medId}-${timeIndex}`)
      setTimeout(() => setJustChecked(null), 600)
    }
  }

  // Add new medication
  const addMedication = (medData: Omit<Medication, 'id'>) => {
    const newMed: Medication = {
      ...medData,
      id: `med-${Date.now()}`,
    }
    setMedications((prev) => [...prev, newMed])
    setShowForm(false)
  }

  // Get status for a medication time slot
  const getTimeStatus = (med: Medication, timeIndex: number): 'upcoming' | 'due_now' | 'taken' | 'missed' => {
    if (med.takenToday[timeIndex]) return 'taken'
    const timeMins = timeToMinutes(med.times[timeIndex])
    // If current time is more than 2 hours past the scheduled time, consider it missed
    if (nowMinutes > timeMins + 120) return 'missed'
    // If within 30 minutes before or after, it's due now
    if (nowMinutes >= timeMins - 30 && nowMinutes <= timeMins + 120) return 'due_now'
    return 'upcoming'
  }

  return (
    <GradientBorderCard animateIndex={3} gradient="from-[#E8788A] via-[#C084FC] to-[#F9A8D4]">
      <div className="px-6 py-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#C084FC]/15 flex items-center justify-center">
            <Pill className="w-4 h-4 text-[#E8788A]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Medication Tracker</h2>
            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
              {takenDoses === totalDoses && totalDoses > 0
                ? 'All medications taken today'
                : `${takenDoses} of ${totalDoses} doses taken`}
            </p>
          </div>
          <ProgressRing taken={takenDoses} total={totalDoses} size={64} strokeWidth={5} />
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1.5">
            <span>Today&apos;s Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="relative h-2 bg-[#FFF0F3] dark:bg-[#3A2030] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#E8788A] via-[#C084FC] to-[#F9A8D4]"
            />
          </div>
        </div>

        {/* Medication list */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin pr-1"
        >
          <AnimatePresence>
            {sortedMedications.map((med) => {
              const allTaken = med.takenToday.every(Boolean)
              return (
                <motion.div
                  key={med.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  className={`rounded-xl border transition-colors duration-200 ${
                    allTaken
                      ? 'bg-[#F0FDF4]/60 dark:bg-[#1A2A1A]/60 border-[#BBF7D0]/60 dark:border-[#2A4A2A]/60'
                      : 'bg-[#FFF0F3]/40 dark:bg-[#3A2030]/40 border-[#F9D0DA]/40 dark:border-[#4A2535]/40'
                  }`}
                >
                  <div className="p-3">
                    {/* Medication header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold truncate ${allTaken ? 'text-[#4A1D2E]/50 dark:text-[#F9D0DA]/50 line-through decoration-[#9B6B7B]/30' : 'text-[#4A1D2E] dark:text-[#F9D0DA]'}`}>
                            {med.name}
                          </span>
                          {allTaken && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                            >
                              <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
                            </motion.span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{med.dosage}</span>
                          <span className="w-1 h-1 rounded-full bg-[#F9D0DA] dark:bg-[#4A2535]" />
                          <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">{getFrequencyLabel(med.frequency)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Time slots with check buttons */}
                    <div className="mt-2 space-y-1.5">
                      {med.times.map((time, idx) => {
                        const isTaken = med.takenToday[idx]
                        const status = getTimeStatus(med, idx)
                        const isJustChecked = justChecked === `${med.id}-${idx}`

                        return (
                          <div
                            key={`${med.id}-${idx}`}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className={`w-3 h-3 ${
                                status === 'due_now'
                                  ? 'text-[#E8788A]'
                                  : status === 'taken'
                                  ? 'text-[#34D399]'
                                  : status === 'missed'
                                  ? 'text-[#F87171]'
                                  : 'text-[#9B6B7B] dark:text-[#A07888]'
                              }`} />
                              <span className={`text-xs font-medium ${
                                isTaken
                                  ? 'text-[#9B6B7B]/60 dark:text-[#A07888]/60 line-through'
                                  : status === 'due_now'
                                  ? 'text-[#E8788A] dark:text-[#F0869A]'
                                  : 'text-[#6B3A4A] dark:text-[#C9A0B0]'
                              }`}>
                                {formatTime(time)}
                              </span>
                              {status === 'due_now' && !isTaken && (
                                <span className="text-[10px] font-medium text-[#E8788A] bg-[#E8788A]/10 dark:bg-[#E8788A]/20 px-1.5 py-0.5 rounded-md">
                                  Due now
                                </span>
                              )}
                              {status === 'missed' && !isTaken && (
                                <span className="text-[10px] font-medium text-[#F87171] bg-[#F87171]/10 px-1.5 py-0.5 rounded-md">
                                  Missed
                                </span>
                              )}
                            </div>
                            <motion.button
                              variants={checkVariants}
                              animate={isJustChecked ? 'checked' : 'unchecked'}
                              onClick={() => toggleTaken(med.id, idx)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                isTaken
                                  ? 'bg-gradient-to-br from-[#34D399] to-[#6EE7B7] shadow-sm shadow-[#34D399]/20'
                                  : 'bg-[#FFF0F3] dark:bg-[#3A2030] border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 hover:border-[#E8788A] dark:hover:border-[#F0869A] hover:bg-[#FFE0E8] dark:hover:bg-[#4A2535]'
                              }`}
                              aria-label={isTaken ? `Mark ${med.name} as not taken` : `Mark ${med.name} as taken`}
                            >
                              <AnimatePresence mode="wait">
                                {isTaken ? (
                                  <motion.div
                                    key="check"
                                    initial={{ scale: 0, rotate: -90 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 90 }}
                                    transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                                  >
                                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <div className="w-2 h-2 rounded-full bg-[#F9D0DA] dark:bg-[#4A2535]" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>

        {/* Add Medication */}
        <AnimatePresence>
          {showForm && (
            <AddMedicationForm
              onAdd={addMedication}
              onCancel={() => setShowForm(false)}
            />
          )}
        </AnimatePresence>

        {/* Add button */}
        {!showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-3 pt-3 border-t border-[#F9D0DA]/40 dark:border-[#4A2535]/40"
          >
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="w-full rounded-xl border-dashed border-[#F9D0DA]/80 dark:border-[#4A2535]/80 text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] hover:text-[#E8788A] dark:hover:text-[#F0869A] hover:border-[#E8788A]/50 dark:hover:border-[#F0869A]/50 h-9 text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Medication
            </Button>
          </motion.div>
        )}
      </div>
    </GradientBorderCard>
  )
}
