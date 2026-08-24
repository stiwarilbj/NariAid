'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format, subDays, startOfWeek, addDays, parseISO, isValid } from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MoodHeatmapProps {
  healthLogs: Array<{ date: string; mood: number }>
}

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------

function getMoodColor(mood: number | null, isDark: boolean = false): string {
  if (mood === null || mood === undefined) {
    return isDark ? '#2A2530' : '#F5F5F5'
  }
  if (mood <= 3) return '#FDDAE2'
  if (mood <= 5) return '#F9A8D4'
  if (mood <= 7) return '#F0869A'
  return '#E8788A'
}

function getMoodLabel(mood: number | null | undefined): string {
  if (mood === null || mood === undefined) return 'No data'
  if (mood <= 2) return 'Very Low'
  if (mood <= 4) return 'Low'
  if (mood <= 6) return 'Moderate'
  if (mood <= 8) return 'Good'
  return 'Excellent'
}

// ---------------------------------------------------------------------------
// Dark mode detection hook
// ---------------------------------------------------------------------------

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()

    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  return isDark
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
      staggerChildren: 0.003,
      delayChildren: 0.15,
    },
  },
}

const cellVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MoodHeatmap({ healthLogs }: MoodHeatmapProps) {
  const isDark = useIsDarkMode()
  const [hoveredCell, setHoveredCell] = useState<{ date: string; mood: number | null } | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Build a map of date -> mood for quick lookup
  const moodMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of healthLogs) {
      try {
        const parsed = parseISO(log.date)
        if (isValid(parsed)) {
          map.set(log.date, log.mood)
        }
      } catch {
        // skip invalid dates
      }
    }
    return map
  }, [healthLogs])

  // Generate grid data for last 3 months
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    const threeMonthsAgo = subDays(today, 89)

    const startDate = startOfWeek(threeMonthsAgo, { weekStartsOn: 0 })

    const allDays: Array<{ date: string; mood: number | null; dayOfWeek: number; isInRange: boolean }> = []
    let current = startDate

    while (current <= today || current.getDay() !== 0) {
      const dateStr = format(current, 'yyyy-MM-dd')
      const isInRange = current >= threeMonthsAgo && current <= today
      allDays.push({
        date: dateStr,
        mood: isInRange ? (moodMap.get(dateStr) ?? null) : null,
        dayOfWeek: current.getDay(),
        isInRange,
      })
      current = addDays(current, 1)
      if (allDays.length > 100) break
    }

    // Group into weeks (columns)
    const weeksArr: Array<Array<{ date: string; mood: number | null; isInRange: boolean }>> = []
    let currentWeek: Array<{ date: string; mood: number | null; isInRange: boolean }> = []

    for (const day of allDays) {
      currentWeek.push({
        date: day.date,
        mood: day.mood,
        isInRange: day.isInRange,
      })
      if (day.dayOfWeek === 6) {
        weeksArr.push(currentWeek)
        currentWeek = []
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', mood: null, isInRange: false })
      }
      weeksArr.push(currentWeek)
    }

    // Calculate month labels
    const labels: Array<{ label: string; weekIndex: number }> = []
    let lastMonth = ''

    weeksArr.forEach((week, wi) => {
      const firstDay = week.find((d) => d.isInRange && d.date)
      if (firstDay && firstDay.date) {
        const monthStr = format(parseISO(firstDay.date), 'MMM')
        if (monthStr !== lastMonth) {
          lastMonth = monthStr
          labels.push({ label: monthStr, weekIndex: wi })
        }
      }
    })

    return { weeks: weeksArr, monthLabels: labels }
  }, [moodMap])

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const visibleDayIndices = [1, 3, 5] // Mon, Wed, Fri

  const handleMouseEnter = (cell: { date: string; mood: number | null }, e: React.MouseEvent) => {
    if (!cell.date) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setHoveredCell(cell)
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 })
  }

  const handleMouseLeave = () => {
    setHoveredCell(null)
  }

  // Legend items
  const legendItems = [
    { label: 'No data', color: '#F5F5F5', darkColor: '#2A2530' },
    { label: '1-3', color: '#FDDAE2', darkColor: '#FDDAE2' },
    { label: '4-5', color: '#F9A8D4', darkColor: '#F9A8D4' },
    { label: '6-7', color: '#F0869A', darkColor: '#F0869A' },
    { label: '8-10', color: '#E8788A', darkColor: '#E8788A' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-[#E8788A] via-[#F9A8D4] to-[#C084FC]"
    >
      <div className="bg-white rounded-[14px] h-full overflow-hidden dark:bg-[#1A0A1E]">
        <div className="px-5 sm:px-6 py-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-[#E8788A] dark:text-[#F0869A]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F0D0DC]">
                Mood Heatmap
              </h2>
              <p className="text-xs text-[#9B6B7B] dark:text-[#A08090]">
                Your mood patterns over the last 3 months
              </p>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-x-auto scrollbar-thin pb-2">
            <div className="inline-flex flex-col gap-[3px] min-w-fit">
              {/* Month labels row */}
              <div className="flex gap-[3px] ml-[36px]">
                {monthLabels.map((ml, i) => {
                  const nextLabel = monthLabels[i + 1]
                  const span = nextLabel ? nextLabel.weekIndex - ml.weekIndex : weeks.length - ml.weekIndex
                  return (
                    <div
                      key={ml.label + ml.weekIndex}
                      className="text-[10px] text-[#9B6B7B] dark:text-[#A08090] font-medium"
                      style={{ width: `${span * 15 + (span - 1) * 3}px` }}
                    >
                      {ml.label}
                    </div>
                  )
                })}
              </div>

              {/* Grid rows with day labels */}
              {Array.from({ length: 7 }, (_, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-[3px]">
                  {/* Day label */}
                  <div className="w-[33px] text-right pr-1">
                    {visibleDayIndices.includes(rowIdx) && (
                      <span className="text-[10px] text-[#9B6B7B] dark:text-[#A08090] font-medium">
                        {dayLabels[rowIdx]}
                      </span>
                    )}
                  </div>
                  {/* Cells for this row across all weeks */}
                  {weeks.map((week, colIdx) => {
                    const cell = week[rowIdx]
                    if (!cell) return (
                      <div
                        key={`empty-${colIdx}`}
                        className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-[3px]"
                      />
                    )
                    const color = getMoodColor(cell.isInRange ? cell.mood : null, isDark)
                    return (
                      <motion.div
                        key={cell.date + '-' + colIdx}
                        variants={cellVariants}
                        onMouseEnter={(e) => cell.isInRange && handleMouseEnter(cell, e)}
                        onMouseLeave={handleMouseLeave}
                        className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-[3px] cursor-pointer transition-transform hover:scale-125 hover:z-10"
                        style={{
                          backgroundColor: color,
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 flex-wrap">
            <span className="text-[10px] text-[#9B6B7B] dark:text-[#A08090] mr-1">Less</span>
            {legendItems.map((item, i) => (
              <div
                key={i}
                className="w-[12px] h-[12px] rounded-[3px] border border-[#F9D0DA]/30 dark:border-[#4A3040]/30"
                style={{ backgroundColor: isDark ? item.darkColor : item.color }}
                title={item.label}
              />
            ))}
            <span className="text-[10px] text-[#9B6B7B] dark:text-[#A08090] ml-1">More</span>
          </div>

          {/* Tooltip */}
          {hoveredCell && hoveredCell.date && (
            <div
              className="fixed z-50 pointer-events-none bg-white/95 dark:bg-[#2A1525]/95 backdrop-blur-md border border-[#F9D0DA] dark:border-[#4A3040] rounded-xl px-3.5 py-2.5 shadow-lg shadow-[#E8788A]/10"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <p className="text-xs font-semibold text-[#4A1D2E] dark:text-[#F0D0DC]">
                {format(parseISO(hoveredCell.date), 'EEE, MMM d')}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: hoveredCell.mood !== null
                      ? getMoodColor(hoveredCell.mood, isDark)
                      : getMoodColor(null, isDark),
                  }}
                />
                <span className="text-[11px] text-[#9B6B7B] dark:text-[#A08090]">
                  {hoveredCell.mood !== null
                    ? `Mood: ${hoveredCell.mood}/10 (${getMoodLabel(hoveredCell.mood)})`
                    : 'No data'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
