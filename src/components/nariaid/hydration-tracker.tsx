'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Plus, Minus, GlassWater } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

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

interface HydrationTrackerProps {
  latestLog: HealthLog | null
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

const glassVariants = {
  empty: { scale: 1 },
  filled: {
    scale: [1, 1.2, 1],
    transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
  },
}

// ---------------------------------------------------------------------------
// Motivational messages
// ---------------------------------------------------------------------------

function getMotivationalMessage(intake: number, goal: number): string {
  const pct = intake / goal
  if (pct === 0) return 'Start your hydration journey today'
  if (pct < 0.25) return 'Good start, keep sipping throughout the day'
  if (pct < 0.5) return 'Making progress, stay consistent'
  if (pct < 0.75) return 'Over halfway there, you are doing great'
  if (pct < 1) return 'Almost at your goal, just a few more'
  return 'Hydration goal reached, well done'
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
// Main HydrationTracker Component
// ---------------------------------------------------------------------------

export default function HydrationTracker({ latestLog }: HydrationTrackerProps) {
  const GOAL = 8
  const [waterIntake, setWaterIntake] = useState(0)
  const [saving, setSaving] = useState(false)

  // Sync with latestLog
  useEffect(() => {
    if (latestLog) {
      setWaterIntake(latestLog.waterIntake)
    }
  }, [latestLog])

  // Update water intake on server
  const updateWaterIntake = useCallback(async (newIntake: number) => {
    setWaterIntake(newIntake)
    setSaving(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      // Check if there's an existing log for today
      const res = await fetch('/api/health-logs')
      if (res.ok) {
        const logs = await res.json()
        const todayLog = logs.find((l: HealthLog) => l.date === today)

        if (todayLog) {
          // Update existing log
          await fetch('/api/health-logs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: todayLog.id, waterIntake: newIntake }),
          })
        } else {
          // Create new log with water intake
          await fetch('/api/health-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: today,
              mood: 5,
              energy: 5,
              sleep: 5,
              stress: 5,
              pain: 0,
              symptoms: '',
              notes: '',
              waterIntake: newIntake,
            }),
          })
        }
      }
    } catch (err) {
      console.error('Failed to update water intake:', err)
    } finally {
      setSaving(false)
    }
  }, [])

  const handleIncrement = () => {
    if (waterIntake < GOAL) {
      updateWaterIntake(waterIntake + 1)
    }
  }

  const handleDecrement = () => {
    if (waterIntake > 0) {
      updateWaterIntake(waterIntake - 1)
    }
  }

  const progressPct = Math.round((waterIntake / GOAL) * 100)

  return (
    <GradientBorderCard animateIndex={3} gradient="from-[#60A5FA] via-[#F9A8D4] to-[#E8788A]">
      <div className="px-6 py-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#60A5FA]/15 to-[#F9A8D4]/15 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-[#60A5FA]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Hydration Tracker</h2>
            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Track your daily water intake</p>
          </div>
          <div className="flex items-center gap-1">
            <motion.span
              key={waterIntake}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
              className="text-xl font-bold gradient-text"
            >
              {waterIntake}
            </motion.span>
            <span className="text-sm text-[#9B6B7B] dark:text-[#A07888]">/{GOAL}</span>
          </div>
        </div>

        {/* Glass icons row */}
        <div className="flex items-center justify-between gap-1 mb-4">
          {Array.from({ length: GOAL }, (_, i) => {
            const isFilled = i < waterIntake
            return (
              <motion.div
                key={i}
                variants={glassVariants}
                animate={isFilled ? 'filled' : 'empty'}
                className="relative flex-1"
              >
                <div
                  className={`w-full aspect-[3/4] rounded-lg border-2 transition-colors duration-300 overflow-hidden relative ${
                    isFilled
                      ? 'border-[#60A5FA]/40 bg-gradient-to-b from-[#E8788A] to-[#F9A8D4] dark:border-[#60A5FA]/30'
                      : 'border-[#F9D0DA]/60 dark:border-[#4A2535]/60 bg-[#FFF0F3]/40 dark:bg-[#3A2030]/40'
                  }`}
                >
                  {isFilled && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#E8788A]/80 to-[#F9A8D4]/80"
                    />
                  )}
                  {/* Glass shape overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GlassWater
                      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                        isFilled ? 'text-white/90' : 'text-[#F9D0DA] dark:text-[#4A2535]'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1.5">
            <span>Daily Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="relative h-2.5 bg-[#FFF0F3] dark:bg-[#3A2030] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#60A5FA] via-[#E8788A] to-[#F9A8D4]"
            />
          </div>
        </div>

        {/* Controls and motivational message */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecrement}
              disabled={waterIntake <= 0 || saving}
              className="w-9 h-9 rounded-xl p-0 border-[#F9D0DA] dark:border-[#4A2535] text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] hover:text-[#E8788A]"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleIncrement}
              disabled={waterIntake >= GOAL || saving}
              className="w-9 h-9 rounded-xl p-0 bg-gradient-to-r from-[#60A5FA] to-[#E8788A] hover:from-[#4B8FE0] hover:to-[#D66A7C] text-white border-0 shadow-sm shadow-[#60A5FA]/20"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] italic flex-1 text-right ml-3">
            {getMotivationalMessage(waterIntake, GOAL)}
          </p>
        </div>
      </div>
    </GradientBorderCard>
  )
}
