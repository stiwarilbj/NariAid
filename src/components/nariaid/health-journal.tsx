'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Save, ChevronDown, ChevronUp, PenLine } from 'lucide-react'
import { format, parseISO } from 'date-fns'
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
  symptoms: string
  waterIntake: number
}

interface WellnessEntry {
  id: string
  date: string
  journalEntry: string
  gratitude: string
  selfCare: string
  meditation?: number
  affirmations?: string
}

interface HealthJournalProps {
  healthLogs: HealthLog[]
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

const entryVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' as any },
  }),
}

// ---------------------------------------------------------------------------
// Mood color helper
// ---------------------------------------------------------------------------

function getMoodColor(mood: number): string {
  if (mood <= 3) return '#EF4444'
  if (mood <= 5) return '#F59E0B'
  if (mood <= 7) return '#E8788A'
  return '#34D399'
}

// ---------------------------------------------------------------------------
// Main HealthJournal Component
// ---------------------------------------------------------------------------

export default function HealthJournal({ healthLogs }: HealthJournalProps) {
  const [entries, setEntries] = useState<WellnessEntry[]>([])
  const [journalText, setJournalText] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [todayEntry, setTodayEntry] = useState<WellnessEntry | null>(null)

  // Fetch existing journal entries
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/wellness')
      if (res.ok) {
        const data = await res.json()
        // Filter to only entries with journal content
        const journalEntries = data.filter((e: WellnessEntry) => e.journalEntry && e.journalEntry.trim().length > 0)
        setEntries(journalEntries)

        // Check for today's entry
        const today = format(new Date(), 'yyyy-MM-dd')
        const existing = data.find((e: WellnessEntry) => e.date === today)
        if (existing) {
          setTodayEntry(existing)
          setJournalText(existing.journalEntry || '')
        }
      }
    } catch (err) {
      console.error('Failed to fetch journal entries:', err)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Save journal entry
  const saveEntry = useCallback(async () => {
    if (!journalText.trim()) return
    setSaving(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const payload = {
        date: today,
        meditation: todayEntry?.meditation ?? 0,
        gratitude: todayEntry?.gratitude ?? '',
        affirmations: todayEntry?.affirmations ?? '',
        selfCare: todayEntry?.selfCare ?? '',
        journalEntry: journalText,
      }

      if (todayEntry) {
        // Update existing
        await fetch('/api/wellness', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: todayEntry.id, ...payload }),
        })
      } else {
        // Create new
        const res = await fetch('/api/wellness', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const newEntry = await res.json()
          setTodayEntry(newEntry)
        }
      }

      // Refresh entries
      await fetchEntries()
    } catch (err) {
      console.error('Failed to save journal entry:', err)
    } finally {
      setSaving(false)
    }
  }, [journalText, todayEntry, fetchEntries])

  // Word count
  const wordCount = journalText.trim() ? journalText.trim().split(/\s+/).length : 0

  // Get mood for a specific date
  const getMoodForDate = (date: string): number | null => {
    const log = healthLogs.find((l) => l.date === date)
    return log ? log.mood : null
  }

  return (
    <motion.div
      custom={8}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
    >
      <div className="px-6 py-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#E8788A]/15 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[#C084FC]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Health Journal</h2>
            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Write your thoughts and reflections</p>
          </div>
          <PenLine className="w-4 h-4 text-[#C084FC]/50" />
        </div>

        {/* Journal text area */}
        <div className="mb-3">
          <textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="How are you feeling today? Write about your day, thoughts, or reflections..."
            className="w-full min-h-[100px] max-h-[300px] p-4 bg-[#FFF5F7] dark:bg-[#1A0D12] border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 rounded-xl text-sm text-[#4A1D2E] dark:text-[#F9D0DA] placeholder:text-[#9B6B7B]/60 dark:placeholder:text-[#A07888]/60 resize-y input-focus-ring"
            style={{ overflowY: 'auto' }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
            <Button
              size="sm"
              onClick={saveEntry}
              disabled={saving || !journalText.trim()}
              className="bg-gradient-to-r from-[#C084FC] to-[#E8788A] hover:from-[#A855F7] hover:to-[#D66A7C] text-white border-0 rounded-xl px-4 py-1.5 text-xs font-medium shadow-sm shadow-[#C084FC]/20 h-auto btn-press"
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Save className="w-3 h-3" />
                  Save Entry
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Previous entries */}
        {entries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dashed border-[#F9D0DA]/40 dark:border-[#4A2535]/40">
            <p className="text-xs font-medium text-[#9B6B7B] dark:text-[#A07888] mb-3">
              Previous Entries
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              <AnimatePresence>
                {entries.slice(0, 10).map((entry, index) => {
                  const isExpanded = expandedId === entry.id
                  const mood = getMoodForDate(entry.date)
                  const entryDate = parseISO(entry.date)
                  const formattedDate = format(entryDate, 'EEE, MMM d')

                  return (
                    <motion.div
                      key={entry.id}
                      custom={index}
                      variants={entryVariants}
                      initial="hidden"
                      animate="visible"
                      className="bg-[#FFF5F7]/60 dark:bg-[#1A0D12]/60 rounded-xl p-3 cursor-pointer card-press"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Mood indicator */}
                        {mood !== null && (
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: getMoodColor(mood) }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">
                              {formattedDate}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
                            )}
                          </div>
                          {!isExpanded && (
                            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] truncate mt-0.5">
                              {entry.journalEntry}
                            </p>
                          )}
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0] mt-2 leading-relaxed whitespace-pre-wrap">
                              {entry.journalEntry}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
