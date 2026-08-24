'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Activity, Heart, Moon, Zap, Flame, ShieldCheck, ExternalLink } from 'lucide-react'
import type { CycleRiskAssessment } from '@/lib/cycle-prediction'

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

interface HealthScoreWidgetProps {
  healthLogs: HealthLog[]
  assessment?: CycleRiskAssessment
}

const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
}

function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function describeMetric(label: string, value: number | null, invert = false) {
  if (value === null) return { label, value: 'No data', description: 'Needs more logs', tone: '#9B6B7B' }
  const rounded = Math.round(value * 10) / 10
  if (invert) {
    if (rounded >= 7) return { label, value: `${rounded}/10`, description: 'High strain', tone: '#C94F68' }
    if (rounded >= 5) return { label, value: `${rounded}/10`, description: 'Watch stress', tone: '#F59E0B' }
    return { label, value: `${rounded}/10`, description: 'Low strain', tone: '#34A77B' }
  }
  if (rounded <= 4) return { label, value: `${rounded}/10`, description: 'Needs support', tone: '#C94F68' }
  if (rounded <= 6) return { label, value: `${rounded}/10`, description: 'Mixed pattern', tone: '#F59E0B' }
  return { label, value: `${rounded}/10`, description: 'Supportive pattern', tone: '#34A77B' }
}

function getStatusClass(status: CycleRiskAssessment['status'] | undefined) {
  switch (status) {
    case 'urgent':
      return 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#451A1A] dark:text-[#FCA5A5]'
    case 'doctor':
      return 'bg-[#FFF0F3] text-[#C94F68] dark:bg-[#3A2030] dark:text-[#F9D0DA]'
    case 'watch':
      return 'bg-[#FFF7E8] text-[#A66A00] dark:bg-[#3B2A13] dark:text-[#FCD34D]'
    default:
      return 'bg-[#EFFAF6] text-[#2F7D62] dark:bg-[#19382E] dark:text-[#A7F3D0]'
  }
}

export default function HealthScoreWidget({ healthLogs, assessment }: HealthScoreWidgetProps) {
  const recent = useMemo(() => healthLogs.slice(0, 7), [healthLogs])
  const metrics = useMemo(() => {
    const mood = average(recent.map((log) => log.mood).filter(Boolean))
    const energy = average(recent.map((log) => log.energy).filter(Boolean))
    const sleep = average(recent.map((log) => log.sleep).filter(Boolean))
    const stress = average(recent.map((log) => log.stress).filter(Boolean))
    return [
      { icon: Heart, ...describeMetric('Mood', mood) },
      { icon: Zap, ...describeMetric('Energy', energy) },
      { icon: Moon, ...describeMetric('Sleep', sleep) },
      { icon: Flame, ...describeMetric('Stress', stress, true) },
    ]
  }, [recent])

  const status = assessment?.status ?? 'watch'
  const title = assessment?.title ?? 'Moderate risk'
  const summary = assessment?.summary ?? 'Add more logs so NariAid can compare your pattern against the trained FedCycle reference model.'
  const potentialProblems = assessment?.riskFactors?.slice(0, 3) ?? ['Not enough recent tracker data yet.']
  const careNote = assessment?.doctorPrompts?.[0] ?? 'Keep logging, and contact a clinician for severe, new, persistent, or disruptive symptoms.'

  return (
    <motion.div
      custom={2}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-[#F9D0DA]/70 bg-white shadow-sm shadow-[#E8788A]/5 dark:border-[#4A2535]/70 dark:bg-[#2A1520]"
    >
      <div className="px-5 py-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFFAF6] dark:bg-[#19382E]">
              <ShieldCheck className="h-4 w-4 text-[#2F7D62] dark:text-[#A7F3D0]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Health Risk Overview</h2>
              <p className="text-xs leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">No score here: NariAid describes your pattern and what to watch.</p>
            </div>
          </div>
          <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(status)}`}>
            {title}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-[#4A1D2E] dark:text-[#F9D0DA]">{summary}</p>

        {assessment?.modelSignals?.[0] && (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-[#F6FAF8] p-3 dark:bg-[#19382E]/50">
            <div>
              <p className="text-xs font-semibold text-[#2F7D62] dark:text-[#A7F3D0]">FedCycle AI ensemble: {assessment.modelSignals[0].label}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#55766A] dark:text-[#A7C9BD]">{assessment.modelSignals[0].summary}</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#55766A] dark:text-[#A7C9BD]">
                Historical-marker estimate {Math.round(assessment.modelSignals[0].estimatedMarkerProbability * 100)}% · {assessment.modelSignals[0].confidence} input confidence
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold capitalize text-[#2F7D62] dark:text-[#A7F3D0]">
              {assessment.modelSignals[0].level}
            </span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="rounded-xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8F5366] dark:text-[#A07888]">
                  <Icon className="h-3.5 w-3.5" style={{ color: metric.tone }} />
                  {metric.label}
                </div>
                <p className="mt-1 text-sm font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">{metric.description}</p>
                <p className="text-[11px] text-[#9B6B7B] dark:text-[#A07888]">Recent avg {metric.value}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-4 rounded-xl border border-[#F9D0DA]/70 bg-[#FFFDFD] p-3 dark:border-[#4A2535] dark:bg-[#21101A]">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#E8788A]" />
            <p className="text-xs font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Potential problems to watch</p>
          </div>
          <div className="space-y-1.5">
            {potentialProblems.map((item) => (
              <p key={item} className="text-xs leading-relaxed text-[#8F5366] dark:text-[#A07888]">{item}</p>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[#FFF7F9] p-3 dark:bg-[#3A2030]/50">
          <p className="text-xs font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Care guidance</p>
          <p className="text-xs leading-relaxed text-[#8F5366] dark:text-[#A07888]">{careNote}</p>
          <a
            href="https://www.mayoclinic.org/healthy-lifestyle/womens-health/in-depth/menstrual-cycle/art-20047186"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-[#E8788A]"
          >
            Learn what to track
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {assessment?.modelPerformance && (
          <p className="mt-3 text-[10px] leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">
            Model: {assessment.modelPerformance}. Data quality: {assessment.dataQuality.status}.
          </p>
        )}

        {healthLogs.length === 0 && (
          <div className="mt-4 rounded-xl bg-[#FFF7F9] px-4 py-5 text-center dark:bg-[#3A2030]/50">
            <p className="text-sm text-[#9B6B7B] dark:text-[#A07888]">Log health data to see your risk pattern.</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
