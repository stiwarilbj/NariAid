'use client'

import { motion } from 'framer-motion'
import {
  BedDouble,
  Dumbbell,
  Users,
  Lightbulb,
  Flame,
  Bath,
  MoonStar,
  Utensils,
  Palette,
  Target,
  MessageCircle,
  ShieldCheck,
  Leaf,
  BookOpen,
  Pill,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CycleRecommendationsProps {
  cycleDay: number
  cycleLength: number
  phaseName: string
}

interface Recommendation {
  icon: LucideIcon
  title: string
  description: string
}

interface PhaseConfig {
  label: string
  color: string
  gradient: string
  bannerGradient: string
  recommendations: Recommendation[]
}

// ---------------------------------------------------------------------------
// Phase configuration
// ---------------------------------------------------------------------------

const phaseConfigs: Record<string, PhaseConfig> = {
  Menstrual: {
    label: 'Menstrual Phase',
    color: '#E8788A',
    gradient: 'from-[#E8788A] via-[#F0869A] to-[#FDA4AF]',
    bannerGradient: 'from-[#E8788A]/20 via-[#F0869A]/10 to-[#FDA4AF]/5',
    recommendations: [
      {
        icon: BedDouble,
        title: 'Gentle Rest',
        description: 'Prioritize sleep and allow your body to recover with extra rest time.',
      },
      {
        icon: Flame,
        title: 'Iron-Rich Foods',
        description: 'Nourish with leafy greens, lentils, and seeds to replenish iron levels.',
      },
      {
        icon: Bath,
        title: 'Warm Comfort',
        description: 'A warm bath or heating pad can help soothe cramps and ease tension.',
      },
      {
        icon: Leaf,
        title: 'Light Movement',
        description: 'Gentle stretching or a short walk can boost circulation and lift your mood.',
      },
    ],
  },
  Follicular: {
    label: 'Follicular Phase',
    color: '#F9A8D4',
    gradient: 'from-[#F9A8D4] via-[#F9B8D8] to-[#FDA4AF]',
    bannerGradient: 'from-[#F9A8D4]/20 via-[#F9B8D8]/10 to-[#FDA4AF]/5',
    recommendations: [
      {
        icon: Dumbbell,
        title: 'New Workouts',
        description: 'Rising energy makes this the ideal time to try a new exercise routine.',
      },
      {
        icon: Users,
        title: 'Social Energy',
        description: 'Connect with friends or plan outings while your social battery is high.',
      },
      {
        icon: Palette,
        title: 'Creative Flow',
        description: 'Channel your heightened creativity into projects and brainstorming.',
      },
      {
        icon: Target,
        title: 'Set Goals',
        description: 'Plan and set objectives for the weeks ahead while your focus is sharp.',
      },
    ],
  },
  Ovulation: {
    label: 'Ovulation Phase',
    color: '#C084FC',
    gradient: 'from-[#C084FC] via-[#D4A5FD] to-[#F9A8D4]',
    bannerGradient: 'from-[#C084FC]/20 via-[#D4A5FD]/10 to-[#F9A8D4]/5',
    recommendations: [
      {
        icon: Dumbbell,
        title: 'Peak Training',
        description: 'Your energy is at its highest — push for intense or challenging workouts.',
      },
      {
        icon: MessageCircle,
        title: 'Key Conversations',
        description: 'Schedule important meetings or discussions while confidence is peaking.',
      },
      {
        icon: ShieldCheck,
        title: 'Bold Decisions',
        description: 'Trust your instincts and take on challenges that require assertiveness.',
      },
      {
        icon: Lightbulb,
        title: 'Share Ideas',
        description: 'Your communication skills are strong — present, pitch, or collaborate now.',
      },
    ],
  },
  Luteal: {
    label: 'Luteal Phase',
    color: '#FDA4AF',
    gradient: 'from-[#FDA4AF] via-[#E8788A] to-[#C084FC]',
    bannerGradient: 'from-[#FDA4AF]/20 via-[#E8788A]/10 to-[#C084FC]/5',
    recommendations: [
      {
        icon: MoonStar,
        title: 'Wind Down',
        description: 'Gradually reduce intensity in workouts and opt for calming exercises like yoga.',
      },
      {
        icon: Utensils,
        title: 'Meal Prep',
        description: 'Prepare nourishing meals ahead of time to support your energy and mood.',
      },
      {
        icon: Pill,
        title: 'Magnesium Boost',
        description: 'Include magnesium-rich foods like dark chocolate, nuts, and avocados.',
      },
      {
        icon: BookOpen,
        title: 'Reflect & Care',
        description: 'Journal, meditate, or practice self-care rituals to nurture inner balance.',
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CycleRecommendations({
  cycleDay,
  cycleLength,
  phaseName,
}: CycleRecommendationsProps) {
  const config = phaseConfigs[phaseName]

  // If the phase is unknown or not configured, don't render
  if (!config) return null

  const dayRange =
    phaseName === 'Menstrual'
      ? 'Days 1-5'
      : phaseName === 'Follicular'
        ? 'Days 6-13'
        : phaseName === 'Ovulation'
          ? 'Days 14-16'
          : `Days 17-${cycleLength}`

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-[#C084FC] via-[#F9A8D4] to-[#E8788A]"
    >
      <div className="bg-white dark:bg-[#2A1520] rounded-[14px] h-full overflow-hidden">
        {/* Gradient Banner */}
        <div
          className="relative px-6 py-5 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${config.color}18 0%, ${config.color}08 60%, transparent 100%)`,
          }}
        >
          {/* Decorative blob in banner */}
          <div
            className="absolute top-[-20px] right-[-20px] w-[120px] h-[120px] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${config.color}20 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }}
          />

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1">
                Phase Recommendations
              </p>
              <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
                {config.label}
              </h2>
            </div>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-1.5"
              style={{
                backgroundColor: `${config.color}15`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: config.color }}
              >
                {dayRange}
              </span>
            </div>
          </div>
        </div>

        {/* Recommendations Grid */}
        <div className="px-5 pb-5 pt-3">
          <motion.div
            className="grid grid-cols-2 gap-3"
            variants={containerVariants}
          >
            {config.recommendations.map((rec, i) => {
              const Icon = rec.icon
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative rounded-xl overflow-hidden"
                >
                  {/* Glass-morphism card with gradient border */}
                  <div
                    className="relative rounded-xl p-[1px]"
                    style={{
                      background: `linear-gradient(135deg, ${config.color}30, ${config.color}10, transparent)`,
                    }}
                  >
                    <div className="bg-gradient-to-br from-[#FFF5F7]/90 to-white/90 dark:from-[#2A1520]/90 dark:to-[#1A0D12]/90 backdrop-blur-sm rounded-[10px] p-4">
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
                        style={{
                          background: `linear-gradient(135deg, ${config.color}18, ${config.color}08)`,
                        }}
                      >
                        <Icon
                          className="w-4.5 h-4.5"
                          style={{ color: config.color }}
                          size={18}
                        />
                      </div>
                      {/* Title */}
                      <h3
                        className="text-sm font-semibold mb-1"
                        style={{ color: config.color }}
                      >
                        {rec.title}
                      </h3>
                      {/* Description */}
                      <p className="text-[11px] leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
