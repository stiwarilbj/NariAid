'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stethoscope, Save, Check } from 'lucide-react'
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

interface SymptomQuickLogProps {
  latestLog: HealthLog | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYMPTOM_OPTIONS = [
  'Cramps',
  'Headache',
  'Bloating',
  'Fatigue',
  'Nausea',
  'Back Pain',
  'Breast Tenderness',
  'Mood Swings',
  'Acne',
  'Insomnia',
  'Cravings',
  'Hot Flashes',
]

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

const chipVariants = {
  unselected: { scale: 1 },
  selected: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
  },
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
// Main SymptomQuickLog Component
// ---------------------------------------------------------------------------

export default function SymptomQuickLog({ latestLog }: SymptomQuickLogProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Pre-fill from today's log
  useEffect(() => {
    if (latestLog?.symptoms) {
      const existing = latestLog.symptoms
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      setSelectedSymptoms(new Set(existing))
    }
  }, [latestLog])

  const toggleSymptom = useCallback((symptom: string) => {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev)
      if (next.has(symptom)) {
        next.delete(symptom)
      } else {
        next.add(symptom)
      }
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const symptomsStr = Array.from(selectedSymptoms).join(', ')

      const res = await fetch('/api/health-logs')
      if (res.ok) {
        const logs = await res.json()
        const todayLog = logs.find((l: HealthLog) => l.date === today)

        if (todayLog) {
          await fetch('/api/health-logs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: todayLog.id, symptoms: symptomsStr }),
          })
        } else {
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
              symptoms: symptomsStr,
              notes: '',
              waterIntake: 0,
            }),
          })
        }

        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (err) {
      console.error('Failed to save symptoms:', err)
    } finally {
      setSaving(false)
    }
  }, [selectedSymptoms])

  return (
    <GradientBorderCard animateIndex={4} gradient="from-[#FDA4AF] via-[#F9A8D4] to-[#C084FC]">
      <div className="px-6 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FDA4AF]/15 to-[#C084FC]/15 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-[#FDA4AF]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Quick Symptom Log</h2>
              <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Tap to select your current symptoms</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 text-[#34D399] text-xs font-medium"
              >
                <Check className="w-4 h-4" />
                Saved
              </motion.div>
            ) : (
              <motion.div key="save-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || selectedSymptoms.size === 0}
                  className="bg-gradient-to-r from-[#FDA4AF] to-[#C084FC] hover:from-[#E8909A] hover:to-[#A855F7] text-white border-0 rounded-xl px-4 py-1.5 text-xs font-medium shadow-sm shadow-[#FDA4AF]/20 h-auto"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {saving ? 'Saving...' : 'Save Symptoms'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Symptom chips */}
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((symptom) => {
            const isSelected = selectedSymptoms.has(symptom)
            return (
              <motion.button
                key={symptom}
                variants={chipVariants}
                animate={isSelected ? 'selected' : 'unselected'}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSymptom(symptom)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors duration-200 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#E8788A] to-[#F9A8D4] text-white border-transparent shadow-sm shadow-[#E8788A]/20'
                    : 'bg-[#FFF0F3]/60 dark:bg-[#3A2030]/60 text-[#6B3A4A] dark:text-[#C9A0B0] border-[#F9D0DA]/60 dark:border-[#4A2535]/60 hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] hover:border-[#E8788A]/40'
                }`}
              >
                {symptom}
              </motion.button>
            )
          })}
        </div>

        {/* Selected count */}
        {selectedSymptoms.size > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] mt-3"
          >
            {selectedSymptoms.size} symptom{selectedSymptoms.size > 1 ? 's' : ''} selected
          </motion.p>
        )}
      </div>
    </GradientBorderCard>
  )
}
