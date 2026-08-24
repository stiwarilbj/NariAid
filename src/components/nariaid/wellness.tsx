'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, isValid } from 'date-fns'
import {
  Heart,
  Sparkles,
  Wind,
  BookOpen,
  PenLine,
  ChevronDown,
  ChevronUp,
  Flower2,
  Sun,
  Moon,
  Star,
  Leaf,
  Music,
  Bath,
  BookOpenCheck,
  Footprints,
  Hand,
  Palette,
  BedDouble,
  TreePine,
  Clock,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WellnessEntry {
  id: string
  date: string
  meditation: number
  gratitude: string
  affirmations: string
  selfCare: string
  journalEntry: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SELF_CARE_ACTIVITIES = [
  { value: 'bath', label: 'Bath', icon: Bath, color: '#60A5FA' },
  { value: 'reading', label: 'Reading', icon: BookOpenCheck, color: '#C084FC' },
  { value: 'walk', label: 'Walk', icon: Footprints, color: '#34D399' },
  { value: 'skincare', label: 'Skincare', icon: Hand, color: '#F9A8D4' },
  { value: 'social', label: 'Social', icon: Heart, color: '#E8788A' },
  { value: 'creative', label: 'Creative', icon: Palette, color: '#FBBF24' },
  { value: 'rest', label: 'Rest', icon: BedDouble, color: '#A78BFA' },
  { value: 'nature', label: 'Nature', icon: TreePine, color: '#4ADE80' },
]

const AFFIRMATIONS = [
  'I honor my body and all it does for me.',
  'I am worthy of rest and restoration.',
  'My feelings are valid and I allow myself to feel them fully.',
  'I trust the wisdom of my body and its natural rhythms.',
  'I release what I cannot control and embrace what I can.',
  'I am growing through every challenge I face.',
  'I deserve the same compassion I give to others.',
  'My health journey is uniquely mine and I honor my pace.',
  'I am resilient, strong, and capable of healing.',
  'I choose thoughts that nourish my mind and spirit.',
  'I embrace change as a natural part of my life cycle.',
  'I am connected to a community of strength and support.',
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
// Helper: calculate wellness score
// ---------------------------------------------------------------------------

function calculateWellnessScore(entry: {
  meditation: number
  gratitude: string
  selfCare: string
  journalEntry: string
}): number {
  let score = 0

  // Meditation: up to 30 points (30 min = max)
  score += Math.min(30, Math.round((entry.meditation / 30) * 30))

  // Gratitude: up to 20 points if filled
  if (entry.gratitude.trim().length > 0) score += 20

  // Self-care: up to 25 points if selected
  if (entry.selfCare) score += 25

  // Journal: up to 25 points based on length
  const journalLen = entry.journalEntry.trim().length
  if (journalLen > 0) {
    if (journalLen >= 100) score += 25
    else if (journalLen >= 50) score += 18
    else if (journalLen >= 20) score += 12
    else score += 6
  }

  return Math.min(100, score)
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Exceptional'
  if (score >= 75) return 'Wonderful'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Moderate'
  if (score >= 20) return 'Developing'
  return 'Starting Out'
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#34D399'
  if (score >= 50) return '#F9A8D4'
  if (score >= 25) return '#C084FC'
  return '#9B6B7B'
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

// ---------------------------------------------------------------------------
// Main Wellness Component
// ---------------------------------------------------------------------------

export default function Wellness() {
  const { userName } = useAppStore()

  // ---- Data state ----
  const [entries, setEntries] = useState<WellnessEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ---- Form state ----
  const [meditationMinutes, setMeditationMinutes] = useState(0)
  const [gratitude, setGratitude] = useState('')
  const [affirmation, setAffirmation] = useState('')
  const [selfCareActivity, setSelfCareActivity] = useState('')
  const [journal, setJournal] = useState('')

  // ---- Entry expansion ----
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // ---- Breathing exercise ----
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale')
  const [breathingScale, setBreathingScale] = useState(0.5)
  const breathingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [breathingCountdown, setBreathingCountdown] = useState(0)
  const [breathingCycles, setBreathingCycles] = useState(0)
  const [breathingSessionStart, setBreathingSessionStart] = useState<number | null>(null)
  const [breathingSessionSeconds, setBreathingSessionSeconds] = useState(0)
  const [breathingPaused, setBreathingPaused] = useState(false)
  const [breathingCelebration, setBreathingCelebration] = useState(false)
  const [breathingPhaseProgress, setBreathingPhaseProgress] = useState(0)
  const [breathingCompleted, setBreathingCompleted] = useState(false)
  const breathingCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const breathingSessionRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- Affirmations rotation ----
  const [affirmationIndex, setAffirmationIndex] = useState(0)
  const affirmationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- Fetch data ----
  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/wellness')
      if (res.ok) {
        const data = await res.json()
        setEntries(data)
      }
    } catch (err) {
      console.error('Failed to fetch wellness entries:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // ---- Breathing exercise logic ----
  const BREATHE_PHASES: { name: 'inhale' | 'hold' | 'exhale'; duration: number; scale: number; color: string }[] = [
    { name: 'inhale', duration: 4000, scale: 1, color: '#C084FC' },
    { name: 'hold', duration: 7000, scale: 1, color: '#F9A8D4' },
    { name: 'exhale', duration: 8000, scale: 0.5, color: '#E8788A' },
  ]

  const resetBreathing = useCallback(() => {
    setBreathingActive(false)
    setBreathingPaused(false)
    setBreathingPhase('inhale')
    setBreathingScale(0.5)
    setBreathingCountdown(0)
    setBreathingCycles(0)
    setBreathingSessionStart(null)
    setBreathingSessionSeconds(0)
    setBreathingPhaseProgress(0)
    setBreathingCelebration(false)
    setBreathingCompleted(false)
    if (breathingTimerRef.current) clearTimeout(breathingTimerRef.current)
    if (breathingCountdownRef.current) clearInterval(breathingCountdownRef.current)
    if (breathingSessionRef.current) clearInterval(breathingSessionRef.current)
  }, [])

  useEffect(() => {
    if (!breathingActive) {
      if (breathingTimerRef.current) clearTimeout(breathingTimerRef.current)
      if (breathingCountdownRef.current) clearInterval(breathingCountdownRef.current)
      if (!breathingPaused) {
        setBreathingScale(0.5)
      }
      return
    }

    let phaseIndex = breathingPhase === 'inhale' ? 0 : breathingPhase === 'hold' ? 1 : 2
    let elapsedInPhase = 0
    let currentPhaseName = breathingPhase

    const phaseSeconds: Record<string, number> = { inhale: 4, hold: 7, exhale: 8 }

    // Start countdown interval
    setBreathingCountdown(phaseSeconds[currentPhaseName])
    setBreathingPhaseProgress(0)

    breathingCountdownRef.current = setInterval(() => {
      elapsedInPhase += 100
      const phase = BREATHE_PHASES[phaseIndex % 3]
      const progress = Math.min(1, elapsedInPhase / phase.duration)
      setBreathingPhaseProgress(progress)

      const remaining = Math.max(0, Math.ceil((phase.duration - elapsedInPhase) / 1000))
      setBreathingCountdown(remaining)
    }, 100)

    const runPhase = () => {
      const phase = BREATHE_PHASES[phaseIndex % 3]
      currentPhaseName = phase.name
      setBreathingPhase(phase.name)
      setBreathingScale(phase.scale)
      elapsedInPhase = 0
      setBreathingCountdown(phaseSeconds[phase.name])
      setBreathingPhaseProgress(0)

      if (breathingCountdownRef.current) clearInterval(breathingCountdownRef.current)
      breathingCountdownRef.current = setInterval(() => {
        elapsedInPhase += 100
        const prog = Math.min(1, elapsedInPhase / phase.duration)
        setBreathingPhaseProgress(prog)
        const rem = Math.max(0, Math.ceil((phase.duration - elapsedInPhase) / 1000))
        setBreathingCountdown(rem)
      }, 100)

      breathingTimerRef.current = setTimeout(() => {
        phaseIndex++
        // Check if a full cycle completed (exhale -> inhale transition)
        if (phase.name === 'exhale' && breathingActive) {
          setBreathingCycles(prev => prev + 1)
          setBreathingCelebration(true)
          setTimeout(() => setBreathingCelebration(false), 800)
        }
        if (breathingActive) runPhase()
      }, phase.duration)
    }

    runPhase()

    return () => {
      if (breathingTimerRef.current) clearTimeout(breathingTimerRef.current)
      if (breathingCountdownRef.current) clearInterval(breathingCountdownRef.current)
    }
  }, [breathingActive])

  // Session duration timer
  useEffect(() => {
    if (breathingActive) {
      if (!breathingSessionStart) {
        setBreathingSessionStart(Date.now())
        setBreathingSessionSeconds(0)
      }
      breathingSessionRef.current = setInterval(() => {
        setBreathingSessionSeconds(prev => prev + 1)
      }, 1000)
    } else {
      if (breathingSessionRef.current) clearInterval(breathingSessionRef.current)
    }
    return () => {
      if (breathingSessionRef.current) clearInterval(breathingSessionRef.current)
    }
  }, [breathingActive, breathingSessionStart])

  const formatSessionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleBreathingToggle = useCallback(() => {
    if (breathingActive) {
      // Pause
      setBreathingActive(false)
      setBreathingPaused(true)
      if (breathingCycles >= 1) {
        setBreathingCompleted(true)
      }
    } else if (breathingPaused) {
      // Resume
      setBreathingPaused(false)
      setBreathingActive(true)
      setBreathingCompleted(false)
    } else {
      // Begin
      setBreathingActive(true)
      setBreathingCompleted(false)
    }
  }, [breathingActive, breathingPaused, breathingCycles])

  // ---- Affirmations rotation ----
  useEffect(() => {
    affirmationTimerRef.current = setInterval(() => {
      setAffirmationIndex(prev => (prev + 1) % AFFIRMATIONS.length)
    }, 6000)

    return () => {
      if (affirmationTimerRef.current) clearInterval(affirmationTimerRef.current)
    }
  }, [])

  // ---- Submit form ----
  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      const payload = {
        date: format(new Date(), 'yyyy-MM-dd'),
        meditation: meditationMinutes,
        gratitude,
        affirmations: affirmation,
        selfCare: selfCareActivity,
        journalEntry: journal,
      }

      const res = await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        await fetchEntries()
        setMeditationMinutes(0)
        setGratitude('')
        setAffirmation('')
        setSelfCareActivity('')
        setJournal('')
      }
    } catch (err) {
      console.error('Failed to save wellness entry:', err)
    } finally {
      setSaving(false)
    }
  }, [meditationMinutes, gratitude, affirmation, selfCareActivity, journal, fetchEntries])

  // ---- Toggle entry expansion ----
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ---- Derived data ----
  const wellnessScore = calculateWellnessScore({
    meditation: meditationMinutes,
    gratitude,
    selfCare: selfCareActivity,
    journalEntry: journal,
  })

  const recentEntries = entries.slice(0, 10)

  const selectedActivity = SELF_CARE_ACTIVITIES.find(a => a.value === selfCareActivity)

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
        className="absolute top-[-80px] right-[-60px] w-[280px] h-[280px] rounded-full opacity-30 dark:opacity-15 dark:opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #F9A8D4 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blob 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[300px] left-[-80px] w-[240px] h-[240px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 10s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute bottom-[200px] right-[-50px] w-[200px] h-[200px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #E8788A 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 12s ease-in-out infinite 4s',
        }}
      />

      {/* Content */}
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
                'radial-gradient(ellipse at 70% 20%, #F9A8D4 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, #C084FC 0%, transparent 50%)',
            }}
          />
          <div className="relative bg-white/70 dark:bg-[#2A1520]/70 backdrop-blur-md border border-[#F9D0DA]/50 dark:border-[#4A2535]/50 rounded-2xl px-6 py-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1">Self-Care & Mindfulness</p>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                  <span className="gradient-text-animated">Wellness</span>
                </h1>
                <p className="text-[#9B6B7B] dark:text-[#A07888] text-sm">
                  Nurture your mind, body, and spirit each day
                </p>
              </div>
              <div className="shrink-0 ml-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] flex items-center justify-center shadow-lg shadow-[#E8788A]/15">
                  <Flower2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 2. Daily Wellness Check                                       */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={1} gradient="from-[#E8788A] via-[#F9A8D4] to-[#FDA4AF]">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-[#E8788A]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Daily Wellness Check</h2>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">How are you caring for yourself today?</p>
                </div>
              </div>
              <AnimatePresence mode="wait">
                {saved ? (
                  <motion.div
                    key="saved"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 text-[#E8788A] text-sm font-medium"
                  >
                    <Sparkles className="w-4 h-4" />
                    Saved!
                  </motion.div>
                ) : (
                  <motion.div key="save-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={saving}
                      className="bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl px-4 py-1.5 text-xs font-medium shadow-sm shadow-[#E8788A]/20 h-auto btn-press"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-5">
              {/* Meditation Minutes Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-[#C084FC]" />
                    <span className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Meditation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">minutes</span>
                    <motion.span
                      key={meditationMinutes}
                      variants={numberVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-lg font-bold text-[#C084FC] w-8 text-right"
                    >
                      {meditationMinutes}
                    </motion.span>
                  </div>
                </div>
                <Slider
                  value={[meditationMinutes]}
                  min={0}
                  max={60}
                  step={5}
                  onValueChange={(val) => setMeditationMinutes(val[0])}
                  className="w-full [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-gradient-to-r [&_[data-slot=slider-track]]:from-[#F9D0DA] [&_[data-slot=slider-track]]:to-[#C084FC]/30 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#C084FC] [&_[data-slot=slider-range]]:to-[#F9A8D4] [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:border-[#C084FC] [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:shadow-[#C084FC]/20"
                />
              </div>

              {/* Gratitude Input */}
              <div className="space-y-2">
                <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-[#FBBF24]" />
                  Gratitude
                </Label>
                <Input
                  placeholder="What are you grateful for today?"
                  value={gratitude}
                  onChange={e => setGratitude(e.target.value)}
                  className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10 input-focus-ring"
                />
              </div>

              {/* Affirmation Input */}
              <div className="space-y-2">
                <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-[#F9A8D4]" />
                  Personal Affirmation
                </Label>
                <Input
                  placeholder="Your affirmation for today..."
                  value={affirmation}
                  onChange={e => setAffirmation(e.target.value)}
                  className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10 input-focus-ring"
                />
              </div>

              {/* Self-Care Activity Selector */}
              <div className="space-y-3">
                <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-[#34D399]" />
                  Self-Care Activity
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {SELF_CARE_ACTIVITIES.map((activity) => {
                    const Icon = activity.icon
                    const isSelected = selfCareActivity === activity.value
                    return (
                      <motion.button
                        key={activity.value}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelfCareActivity(isSelected ? '' : activity.value)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 cursor-pointer transition-all border glass-card-hover card-press ${
                          isSelected
                            ? 'bg-[#FFF0F3] dark:bg-[#3A2030] border-[#E8788A]/40 shadow-sm'
                            : 'bg-[#FFF5F7] border-[#F9D0DA]/40 dark:border-[#4A2535]/40 hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]/60'
                        }`}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: isSelected ? '#E8788A' : activity.color }}
                        />
                        <span className={`text-[10px] font-medium ${isSelected ? 'text-[#E8788A]' : 'text-[#9B6B7B] dark:text-[#A07888]'}`}>
                          {activity.label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Journal Textarea */}
              <div className="space-y-2">
                <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium flex items-center gap-1.5">
                  <PenLine className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
                  Journal
                </Label>
                <Textarea
                  placeholder="Write about your day, feelings, reflections..."
                  value={journal}
                  onChange={e => setJournal(e.target.value)}
                  className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] min-h-[100px] resize-y input-focus-ring"
                />
              </div>
            </div>
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 3. Wellness Score                                             */}
        {/* ============================================================ */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden shimmer-shine"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#C084FC]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Wellness Score</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Based on today's wellness check</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Score Circle */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#FFF0F3" strokeWidth="8" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#wellnessGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - wellnessScore / 100)}
                    initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - wellnessScore / 100) }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                  <defs>
                    <linearGradient id="wellnessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#E8788A" />
                      <stop offset="50%" stopColor="#F9A8D4" />
                      <stop offset="100%" stopColor="#C084FC" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    key={wellnessScore}
                    variants={numberVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-2xl font-bold bg-gradient-to-r from-[#E8788A] to-[#C084FC] bg-clip-text text-transparent"
                  >
                    {wellnessScore}
                  </motion.span>
                  <span className="text-[9px] text-[#9B6B7B] dark:text-[#A07888]">/ 100</span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="flex-1 space-y-2">
                <Badge
                  className="text-xs font-semibold border-0 rounded-lg px-3 py-1 mb-2"
                  style={{
                    backgroundColor: `${getScoreColor(wellnessScore)}18`,
                    color: getScoreColor(wellnessScore),
                  }}
                >
                  {getScoreLabel(wellnessScore)}
                </Badge>

                <div className="space-y-1.5">
                  {[
                    { label: 'Meditation', value: Math.min(30, Math.round((meditationMinutes / 30) * 30)), max: 30 },
                    { label: 'Gratitude', value: gratitude.trim().length > 0 ? 20 : 0, max: 20 },
                    { label: 'Self-Care', value: selfCareActivity ? 25 : 0, max: 25 },
                    { label: 'Journal', value: journal.trim().length >= 100 ? 25 : journal.trim().length >= 50 ? 18 : journal.trim().length >= 20 ? 12 : journal.trim().length > 0 ? 6 : 0, max: 25 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] w-16 shrink-0">{item.label}</span>
                      <div className="flex-1 h-1.5 bg-[#FFF0F3] dark:bg-[#3A2030] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.value / item.max) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-[#E8788A] to-[#F9A8D4]"
                        />
                      </div>
                      <span className="text-[10px] font-medium text-[#6B3A4A] dark:text-[#C9A0B0] w-8 text-right">{item.value}/{item.max}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 4. Guided Breathing Exercise                                  */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={3} gradient="from-[#C084FC] via-[#F9A8D4] to-[#E8788A]" className="animated-gradient-border">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                  <Wind className="w-4 h-4 text-[#C084FC]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Guided Breathing</h2>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">4-7-8 relaxation technique</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {breathingPaused && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={resetBreathing}
                    className="rounded-xl px-3 py-1.5 text-xs font-medium border border-[#F9D0DA] dark:border-[#4A2535] bg-white text-[#9B6B7B] dark:text-[#A07888] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] h-auto shadow-sm"
                  >
                    Reset
                  </motion.button>
                )}
                <Button
                  size="sm"
                  onClick={handleBreathingToggle}
                  className={`rounded-xl px-4 py-1.5 text-xs font-medium border-0 h-auto shadow-sm btn-press ${
                    breathingActive
                      ? 'bg-[#FFF0F3] dark:bg-[#3A2030] text-[#E8788A] hover:bg-[#F9D0DA]/40 dark:hover:bg-[#4A2535]/40'
                      : 'bg-gradient-to-r from-[#C084FC] to-[#F9A8D4] text-white hover:from-[#A855F7] hover:to-[#F0869A]'
                  }`}
                >
                  {breathingActive ? (
                    <span>Pause</span>
                  ) : breathingPaused ? (
                    <span>Resume</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Wind className="w-3.5 h-3.5" />Begin</span>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center py-6">
              {/* Breathing Circle */}
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* Outer pulsing ring */}
                <motion.div
                  animate={{
                    scale: breathingActive ? [1, 1.15, 1] : 1,
                    opacity: breathingActive ? 0.2 : 0.05,
                  }}
                  transition={{
                    scale: {
                      duration: breathingPhase === 'inhale' ? 4 : breathingPhase === 'hold' ? 7 : 8,
                      ease: 'easeInOut',
                      repeat: Infinity,
                    },
                    opacity: { duration: 1 },
                  }}
                  className="absolute w-44 h-44 rounded-full border-2 border-[#F9A8D4]/30"
                />

                {/* Outer glow ring */}
                <motion.div
                  animate={{
                    scale: breathingActive ? breathingScale : 0.5,
                    opacity: breathingActive ? [0.3, 0.15, 0.3] : 0.1,
                  }}
                  transition={{
                    scale: {
                      duration: breathingPhase === 'inhale' ? 4 : breathingPhase === 'hold' ? 7 : 8,
                      ease: 'easeInOut',
                    },
                    opacity: {
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }}
                  className="absolute w-40 h-40 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, #C084FC 0%, #F9A8D4 40%, transparent 70%)',
                    filter: 'blur(20px)',
                  }}
                />

                {/* Progress ring SVG */}
                <svg className="absolute w-36 h-36" viewBox="0 0 144 144">
                  <circle cx="72" cy="72" r="66" fill="none" stroke="#FFF0F3" strokeWidth="3" />
                  <motion.circle
                    cx="72"
                    cy="72"
                    r="66"
                    fill="none"
                    stroke={breathingPhase === 'inhale' ? '#C084FC' : breathingPhase === 'hold' ? '#F9A8D4' : '#E8788A'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 66}
                    strokeDashoffset={2 * Math.PI * 66 * (1 - breathingPhaseProgress)}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                    className="transition-none"
                  />
                </svg>

                {/* Celebration glow */}
                <AnimatePresence>
                  {breathingCelebration && (
                    <motion.div
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="absolute w-28 h-28 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, #C084FC 0%, #F9A8D4 50%, transparent 80%)',
                        filter: 'blur(8px)',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Inner circle */}
                <motion.div
                  animate={{
                    scale: breathingActive || breathingPaused ? breathingScale : 0.5,
                  }}
                  transition={{
                    duration: breathingPhase === 'inhale' ? 4 : breathingPhase === 'hold' ? 7 : 8,
                    ease: 'easeInOut',
                  }}
                  className={`relative w-24 h-24 rounded-full bg-gradient-to-br from-[#C084FC]/20 to-[#F9A8D4]/20 border-2 flex items-center justify-center transition-colors duration-300 ${
                    breathingCelebration ? 'border-[#C084FC]/80 shadow-lg shadow-[#C084FC]/30' : 'border-[#F9A8D4]/40'
                  }`}
                >
                  <motion.div
                    animate={{
                      scale: breathingActive || breathingPaused ? breathingScale * 0.7 : 0.35,
                    }}
                    transition={{
                      duration: breathingPhase === 'inhale' ? 4 : breathingPhase === 'hold' ? 7 : 8,
                      ease: 'easeInOut',
                    }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C084FC]/30 to-[#F9A8D4]/30 border border-[#C084FC]/30 flex items-center justify-center"
                  >
                    {(breathingActive || breathingPaused) ? (
                      <motion.span
                        key={breathingCountdown}
                        initial={{ opacity: 0.5, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-xl font-bold"
                        style={{ color: breathingPhase === 'inhale' ? '#C084FC' : breathingPhase === 'hold' ? '#F9A8D4' : '#E8788A' }}
                      >
                        {breathingCountdown}
                      </motion.span>
                    ) : (
                      <Wind className={`w-5 h-5 text-[#C084FC] ${breathingActive ? 'icon-spin' : ''}`} />
                    )}
                  </motion.div>
                </motion.div>
              </div>

              {/* Phase label and cycle counter */}
              <div className="mt-4 text-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={breathingActive || breathingPaused ? breathingPhase : 'idle'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm font-medium capitalize"
                    style={{ color: breathingPhase === 'inhale' ? '#C084FC' : breathingPhase === 'hold' ? '#F9A8D4' : '#E8788A' }}
                  >
                    {breathingActive || breathingPaused ? breathingPhase : 'Ready'}
                  </motion.p>
                </AnimatePresence>
                {breathingCycles > 0 && (breathingActive || breathingPaused) && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-0.5"
                  >
                    Cycle {breathingCycles}
                  </motion.p>
                )}
              </div>

              {/* Completed message */}
              <AnimatePresence>
                {breathingCompleted && !breathingActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                    className="mt-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#C084FC]/10 to-[#F9A8D4]/10 border border-[#C084FC]/20"
                  >
                    <p className="text-xs font-semibold text-[#C084FC]">Completed! {breathingCycles} cycle{breathingCycles > 1 ? 's' : ''} finished</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Session duration and duration hints */}
              <div className="flex items-center gap-4 mt-3">
                {[
                  { label: 'Inhale', sec: '4s', color: '#C084FC' },
                  { label: 'Hold', sec: '7s', color: '#F9A8D4' },
                  { label: 'Exhale', sec: '8s', color: '#E8788A' },
                ].map((phase) => (
                  <div key={phase.label} className="text-center">
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">{phase.label}</p>
                    <p className="text-xs font-semibold" style={{ color: phase.color }}>{phase.sec}</p>
                  </div>
                ))}
              </div>

              {/* Session timer */}
              {(breathingActive || (breathingPaused && breathingSessionSeconds > 0)) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 mt-3"
                >
                  <Clock className="w-3 h-3 text-[#9B6B7B] dark:text-[#A07888]" />
                  <span className="text-xs font-mono text-[#9B6B7B] dark:text-[#A07888]">{formatSessionTime(breathingSessionSeconds)}</span>
                </motion.div>
              )}
            </div>
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 5. Positive Affirmations                                      */}
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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F9A8D4]/15 to-[#E8788A]/15 flex items-center justify-center">
                <Star className="w-4 h-4 text-[#F9A8D4]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Positive Affirmations</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Empowering words for your journey</p>
              </div>
            </div>

            <div className="relative bg-gradient-to-r from-[#FFF0F3] to-[#F5F3FF] rounded-xl p-6 min-h-[80px] flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 50% 50%, #E8788A 0%, transparent 60%)',
                }}
              />
              <AnimatePresence mode="wait">
                <motion.p
                  key={affirmationIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                  className="relative text-center text-[#4A1D2E] dark:text-[#F9D0DA] text-base font-medium italic leading-relaxed"
                >
                  &ldquo;{AFFIRMATIONS[affirmationIndex]}&rdquo;
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Affirmation dots */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {AFFIRMATIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setAffirmationIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === affirmationIndex
                      ? 'bg-[#E8788A] w-4'
                      : 'bg-[#F9D0DA] hover:bg-[#F9A8D4]'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 6. Recent Wellness Entries                                    */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={5} gradient="from-[#F9A8D4] via-[#C084FC] to-[#E8788A]">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F9A8D4]/15 to-[#C084FC]/15 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#F9A8D4]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Recent Entries</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Last {Math.min(10, entries.length)} wellness check-ins</p>
              </div>
            </div>

            {recentEntries.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F3] dark:bg-[#3A2030] flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-[#F9A8D4]" />
                </div>
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">No entries yet</p>
                <p className="text-xs text-[#9B6B7B]/70 mt-1">Complete your first wellness check above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentEntries.map((entry, i) => {
                  const isExpanded = expandedIds.has(entry.id)
                  const entryScore = calculateWellnessScore(entry)
                  const activityData = SELF_CARE_ACTIVITIES.find(a => a.value === entry.selfCare)

                  return (
                    <motion.div
                      key={entry.id}
                      custom={i}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      className="bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#FFF5F7]/40 dark:to-[#2A1520]/40 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        {/* Score badge */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${getScoreColor(entryScore)}15` }}
                        >
                          <span className="text-xs font-bold" style={{ color: getScoreColor(entryScore) }}>
                            {entryScore}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">
                            {formatDateSafe(entry.date)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {entry.meditation > 0 && (
                              <span className="text-[10px] text-[#C084FC]">{entry.meditation}m med</span>
                            )}
                            {activityData && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1.5 py-0 bg-[#FFF0F3] dark:bg-[#3A2030] text-[#9B6B7B] dark:text-[#A07888] border-0 rounded-md"
                              >
                                {activityData.label}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-[#9B6B7B] dark:text-[#A07888] shrink-0" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 space-y-2 border-t border-[#F9D0DA]/30 dark:border-[#4A2535]/30">
                              <div className="pt-3 grid grid-cols-2 gap-2">
                                <div className="bg-[#FFF5F7] rounded-lg p-2.5">
                                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Gratitude</p>
                                  <p className="text-xs text-[#4A1D2E] dark:text-[#F9D0DA] mt-0.5">{entry.gratitude || '--'}</p>
                                </div>
                                <div className="bg-[#FFF5F7] rounded-lg p-2.5">
                                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Affirmation</p>
                                  <p className="text-xs text-[#4A1D2E] dark:text-[#F9D0DA] mt-0.5">{entry.affirmations || '--'}</p>
                                </div>
                              </div>
                              {entry.journalEntry && (
                                <div className="bg-[#FFF5F7] dark:bg-[#3A2030] rounded-lg p-2.5">
                                  <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Journal</p>
                                  <p className="text-xs text-[#4A1D2E] dark:text-[#F9D0DA] mt-0.5 leading-relaxed">{entry.journalEntry}</p>
                                </div>
                              )}
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
        </GradientBorderCard>

      </div>
    </motion.div>
  )
}
