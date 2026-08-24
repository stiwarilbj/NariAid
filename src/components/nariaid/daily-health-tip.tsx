'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyHealthTipProps {
  phase: string // 'Menstrual' | 'Follicular' | 'Ovulation' | 'Luteal' | 'Unknown'
  phaseColor: string
}

// ---------------------------------------------------------------------------
// Tips database
// ---------------------------------------------------------------------------

const tipsDatabase: Record<string, Array<{ text: string; category: string }>> = {
  Menstrual: [
    { text: 'Rest is productive. Allow yourself extra sleep and slower mornings during your period.', category: 'Rest' },
    { text: 'Iron-rich foods like leafy greens and lentils help replenish what your body loses during menstruation.', category: 'Nutrition' },
    { text: 'Gentle stretching and yoga can help relieve cramps and lower back pain.', category: 'Movement' },
    { text: 'Warm beverages like ginger tea can soothe discomfort and reduce inflammation.', category: 'Comfort' },
  ],
  Follicular: [
    { text: 'Your energy is rising — this is a great time for challenging workouts and new projects.', category: 'Energy' },
    { text: 'Creative thinking peaks during this phase. Brainstorm and plan ahead.', category: 'Mindset' },
    { text: 'Increase protein intake to support the energy surge of this phase.', category: 'Nutrition' },
    { text: 'Social connections feel more natural now. Schedule important conversations.', category: 'Social' },
  ],
  Ovulation: [
    { text: 'Peak energy and confidence — tackle your most ambitious goals today.', category: 'Energy' },
    { text: 'Your communication skills are at their best. Have those important conversations.', category: 'Social' },
    { text: 'This is your most fertile window. Be mindful of your family planning goals.', category: 'Awareness' },
    { text: 'High energy supports intense workouts. Push your fitness boundaries safely.', category: 'Movement' },
  ],
  Luteal: [
    { text: 'As energy naturally dips, prioritize completing over starting new projects.', category: 'Productivity' },
    { text: 'Magnesium-rich foods like dark chocolate and nuts can help with PMS symptoms.', category: 'Nutrition' },
    { text: 'Prioritize sleep hygiene — your body needs more rest during this phase.', category: 'Rest' },
    { text: 'Journaling can help process the emotional shifts common in this phase.', category: 'Mindset' },
  ],
  Unknown: [
    { text: 'Staying hydrated improves every aspect of your health. Aim for 8 glasses daily.', category: 'Hydration' },
    { text: 'A 10-minute walk can boost your mood and energy for hours.', category: 'Movement' },
    { text: 'Consistent sleep schedules help regulate your hormonal cycles.', category: 'Rest' },
    { text: 'Mindful breathing for just 2 minutes can significantly reduce stress levels.', category: 'Mindset' },
  ],
}

const phaseLabels: Record<string, string> = {
  Menstrual: 'Menstrual Phase',
  Follicular: 'Follicular Phase',
  Ovulation: 'Ovulation Phase',
  Luteal: 'Luteal Phase',
  Unknown: 'Daily Wellness',
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const tipVariants = {
  enter: { opacity: 0, x: 20, filter: 'blur(4px)' },
  center: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    x: -20,
    filter: 'blur(4px)',
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

const containerVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DailyHealthTip({ phase, phaseColor }: DailyHealthTipProps) {
  const tips = tipsDatabase[phase] || tipsDatabase.Unknown
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * tips.length))

  const currentTip = tips[tipIndex % tips.length]
  const label = phaseLabels[phase] || phaseLabels.Unknown

  const nextTip = useCallback(() => {
    setTipIndex((prev) => (prev + 1) % tips.length)
  }, [tips.length])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative rounded-2xl overflow-hidden bg-white border border-[#F9D0DA]/60 dark:bg-[#1A0A1E] dark:border-[#4A3040]/40"
    >
      {/* Gradient accent strip on the left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-2xl"
        style={{
          background: `linear-gradient(180deg, ${phaseColor}, ${phaseColor}80)`,
        }}
      />

      <div className="px-5 sm:px-6 py-5 pl-7 sm:pl-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${phaseColor}18, ${phaseColor}08)`,
              }}
            >
              <Lightbulb className="w-4 h-4" style={{ color: phaseColor }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F0D0DC]">
                Daily Health Tips
              </h2>
              <p className="text-xs text-[#9B6B7B] dark:text-[#A08090]">{label}</p>
            </div>
          </div>

          {/* Tip counter */}
          <div className="flex items-center gap-1.5">
            {tips.map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: i === tipIndex % tips.length ? phaseColor : '#F9D0DA',
                  transform: i === tipIndex % tips.length ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Tip content with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tipIndex}
            variants={tipVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="min-h-[60px]"
          >
            {/* Category badge */}
            <div className="mb-2.5">
              <span
                className="inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: `${phaseColor}15`,
                  color: phaseColor,
                }}
              >
                {currentTip.category}
              </span>
            </div>

            {/* Tip text */}
            <p className="text-sm text-[#4A1D2E] dark:text-[#F0D0DC] leading-relaxed">
              {currentTip.text}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Next Tip button */}
        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={nextTip}
            className="group flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 py-1.5 h-auto border-0 hover:bg-transparent"
            style={{ color: phaseColor }}
          >
            Next Tip
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
