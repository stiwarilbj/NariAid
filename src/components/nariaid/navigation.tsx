'use client'

import { useAppStore, type TabId } from '@/store/app-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  Heart,
  Home,
  Menu,
  Settings,
  TrendingUp,
  User,
  X,
} from 'lucide-react'

const primaryTabs: { id: TabId | 'more'; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Cycle', icon: CalendarDays },
  { id: 'health-log', label: 'Track', icon: ClipboardList },
  { id: 'progress', label: 'Trends', icon: TrendingUp },
  { id: 'more', label: 'Menu', icon: Menu },
]

const primaryTabIds: TabId[] = ['dashboard', 'calendar', 'health-log', 'progress']

type MoreItem = {
  id: TabId
  label: string
  description: string
  icon: React.ElementType
  color: string
}

type MoreGroup = {
  title: string
  items: MoreItem[]
}

const moreGroups: MoreGroup[] = [
  {
    title: 'Care',
    items: [
      { id: 'reminders', label: 'Reminders', description: 'Medication and wellness prompts', icon: Bell, color: '#C084FC' },
      { id: 'wellness', label: 'Wellness', description: 'Self-care and symptom support', icon: Heart, color: '#F472B6' },
    ],
  },
  {
    title: 'History',
    items: [
      { id: 'reports', label: 'Reports', description: 'Exportable health summaries', icon: FileBarChart, color: '#60A5FA' },
      { id: 'activity', label: 'Activity', description: 'Recent entries and changes', icon: Activity, color: '#FBBF24' },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'profile', label: 'Profile', description: 'Cycle details and preferences', icon: User, color: '#A78BFA' },
      { id: 'settings', label: 'Settings', description: 'Appearance and app controls', icon: Settings, color: '#9B6B7B' },
    ],
  },
]

export function BottomNav({ onSidebarChange }: { onSidebarChange?: (open: boolean) => void }) {
  const { activeTab, setActiveTab, setSidebarOpen, sidebarOpen } = useAppStore()

  const setMoreOpen = (open: boolean) => {
    if (onSidebarChange) {
      onSidebarChange(open)
    } else {
      setSidebarOpen(open)
    }
  }

  const handleTabClick = (id: TabId | 'more') => {
    if (id === 'more') {
      setMoreOpen(!sidebarOpen)
      return
    }

    setActiveTab(id)
    setMoreOpen(false)
  }

  const handleMoreItem = (item: MoreItem) => {
    setActiveTab(item.id)
    setMoreOpen(false)
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#F9D0DA] bg-white/95 backdrop-blur-xl dark:border-[#4A2535] dark:bg-[#2A1520]/95">
        <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-around px-1.5">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === 'more'
              ? sidebarOpen || !primaryTabIds.includes(activeTab)
              : activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-[#E8788A] dark:text-[#F0869A]'
                    : 'text-[#9B6B7B] hover:text-[#E8788A] dark:text-[#A07888] dark:hover:text-[#F0869A]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate leading-tight">{tab.label}</span>
                <span
                  className={`h-0.5 w-5 rounded-full transition-opacity ${
                    isActive ? 'bg-[#E8788A] opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </nav>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[70] max-h-[78vh] overflow-y-auto rounded-t-3xl border-t border-[#F9D0DA] bg-white shadow-2xl dark:border-[#4A2535] dark:bg-[#2A1520]"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-[#F9D0DA] dark:bg-[#4A2535]" />
              </div>

              <div className="flex items-center justify-between px-6 pb-3">
                <div>
                  <span className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Menu</span>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Everything that does not need the daily home screen.</p>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="rounded-lg p-1.5 transition-colors hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030]"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4 text-[#9B6B7B] dark:text-[#A07888]" />
                </button>
              </div>

              <div className="space-y-4 px-5 pb-8">
                {moreGroups.map((group) => (
                  <section key={group.title} className="space-y-2">
                    <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-[#9B6B7B] dark:text-[#A07888]">{group.title}</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.id

                        return (
                          <motion.button
                            key={item.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleMoreItem(item)}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                              isActive
                                ? 'border-[#E8788A]/30 bg-[#FFF0F3] dark:border-[#F0869A]/30 dark:bg-[#3A2030]'
                                : 'border-[#F9D0DA]/70 hover:bg-[#FFF7F9] dark:border-[#4A2535] dark:hover:bg-[#3A2030]/60'
                            }`}
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                              style={{ backgroundColor: `${item.color}16` }}
                            >
                              <Icon className="h-5 w-5" style={{ color: item.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{item.label}</p>
                              <p className="truncate text-xs text-[#9B6B7B] dark:text-[#A07888]">{item.description}</p>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export function SideNav() {
  return null
}
