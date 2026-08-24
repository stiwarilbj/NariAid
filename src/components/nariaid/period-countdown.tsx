'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Clock, Droplets } from 'lucide-react'
import { format, differenceInDays, addDays, parseISO, isValid } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileData {
  id: string
  name: string
  cycleLength: number
  lastPeriodStart: string
}

interface CycleInfo {
  cycleDay: number
  phase: string
  nextPeriod: string
  daysUntilNext: number
  phaseColor: string
}

interface PeriodCountdownProps {
  profile: ProfileData | null
  cycleInfo: CycleInfo
}

// ---------------------------------------------------------------------------
// Phase colors and labels
// ---------------------------------------------------------------------------

const PHASE_CONFIG: Record<string, { gradient: string; label: string }> = {
  Menstrual: { gradient: 'from-[#E8788A] to-[#F9A8D4]', label: 'Menstrual' },
  Follicular: { gradient: 'from-[#F9A8D4] to-[#C084FC]', label: 'Follicular' },
  Ovulation: { gradient: 'from-[#C084FC] to-[#A78BFA]', label: 'Ovulation' },
  Luteal: { gradient: 'from-[#FDA4AF] to-[#F9A8D4]', label: 'Luteal' },
  Unknown: { gradient: 'from-[#9B6B7B] to-[#F9A8D4]', label: 'Unknown' },
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

const countdownVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
      delay: 0.3,
    },
  },
}

// ---------------------------------------------------------------------------
// Gradient border wrapper with dynamic phase color
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
// SVG Circular Progress Ring
// ---------------------------------------------------------------------------

function CycleProgressRing({
  value,
  maxValue,
  size = 130,
  strokeWidth = 8,
  color,
}: {
  value: number
  maxValue: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / maxValue, 1)
  const offset = circumference - progress * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-[#FFF0F3] dark:text-[#3A2030]"
      />
      {/* Progress ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main PeriodCountdown Component
// ---------------------------------------------------------------------------

export default function PeriodCountdown({ profile, cycleInfo }: PeriodCountdownProps) {
  const [logging, setLogging] = useState(false)

  const phaseConfig = PHASE_CONFIG[cycleInfo.phase] || PHASE_CONFIG.Unknown

  const cycleLength = profile?.cycleLength ?? 28

  // Handle "Log Period Start" button
  const handleLogPeriod = useCallback(async () => {
    if (!profile?.id) return
    setLogging(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          lastPeriodStart: today,
        }),
      })
      // Reload to refresh data
      window.location.reload()
    } catch (err) {
      console.error('Failed to log period start:', err)
    } finally {
      setLogging(false)
    }
  }, [profile])

  const gradientStr = phaseConfig.gradient
    .replace('from-[', '')
    .replace(']', '')

  return (
    <GradientBorderCard
      animateIndex={5}
      gradient={`${phaseConfig.gradient.replace('from-', 'from-').replace('to-', 'via-').replace(/via-\[#[A-Fa-f0-9]+\]/, 'to-')} ${phaseConfig.gradient.split(' ').pop()}`}
    >
      <div className="px-6 py-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${cycleInfo.phaseColor}18` }}
          >
            <CalendarDays className="w-4 h-4" style={{ color: cycleInfo.phaseColor }} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Period Countdown</h2>
            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Days until your next period</p>
          </div>
        </div>

        {cycleInfo.phase !== 'Unknown' ? (
          <div className="flex items-center gap-5">
            {/* Circular countdown ring */}
            <div className="relative shrink-0">
              <CycleProgressRing
                value={cycleInfo.cycleDay}
                maxValue={cycleLength}
                size={120}
                strokeWidth={7}
                color={cycleInfo.phaseColor}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  variants={countdownVariants}
                  initial="hidden"
                  animate="visible"
                  key={cycleInfo.daysUntilNext}
                  className="text-3xl font-bold"
                  style={{ color: cycleInfo.phaseColor }}
                >
                  {cycleInfo.daysUntilNext}
                </motion.span>
                <span className="text-[9px] text-[#9B6B7B] dark:text-[#A07888] font-medium">days</span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-3">
              {/* Estimated date */}
              <div>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-0.5">Estimated Date</p>
                <p className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{cycleInfo.nextPeriod}</p>
              </div>

              {/* Current phase */}
              <div>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] mb-1">Current Phase</p>
                <Badge
                  className="text-xs font-semibold border-0 rounded-lg px-3 py-1"
                  style={{
                    backgroundColor: `${cycleInfo.phaseColor}18`,
                    color: cycleInfo.phaseColor,
                  }}
                >
                  {cycleInfo.phase}
                </Badge>
              </div>

              {/* Log Period Start button */}
              <Button
                size="sm"
                onClick={handleLogPeriod}
                disabled={logging}
                className="w-full bg-gradient-to-r from-[#E8788A] to-[#F9A8D4] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl py-1.5 text-xs font-medium shadow-sm shadow-[#E8788A]/20 h-auto mt-1"
              >
                <Clock className="w-3 h-3 mr-1.5" />
                {logging ? 'Saving...' : 'Log Period Start'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${cycleInfo.phaseColor}15` }}
            >
              <CalendarDays className="w-6 h-6" style={{ color: cycleInfo.phaseColor }} />
            </div>
            <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] mb-3">
              Set up your cycle in Profile to see your countdown
            </p>
            <Button
              size="sm"
              onClick={handleLogPeriod}
              disabled={logging || !profile?.id}
              className="bg-gradient-to-r from-[#E8788A] to-[#F9A8D4] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl px-4 py-1.5 text-xs font-medium shadow-sm shadow-[#E8788A]/20 h-auto"
            >
              <Clock className="w-3 h-3 mr-1.5" />
              {logging ? 'Saving...' : 'Log Period Start'}
            </Button>
          </div>
        )}
      </div>
    </GradientBorderCard>
  )
}
