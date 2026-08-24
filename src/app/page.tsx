'use client'

import { useAppStore, type TabId } from '@/store/app-store'
import { BottomNav, SideNav } from '@/components/nariaid/navigation'
import Dashboard from '@/components/nariaid/dashboard'
import CalendarPage from '@/components/nariaid/calendar-page'
import HealthLog from '@/components/nariaid/health-log'
import Reminders from '@/components/nariaid/reminders'
import ProgressPage from '@/components/nariaid/progress'
import Wellness from '@/components/nariaid/wellness'
import Profile from '@/components/nariaid/profile'
import Reports from '@/components/nariaid/reports'
import ActivityPage from '@/components/nariaid/activity'
import Settings from '@/components/nariaid/settings'
import { Toaster } from '@/components/ui/toaster'
import AIChat from '@/components/nariaid/ai-chat'
import NotificationCenter from '@/components/nariaid/notification-center'
import { useEffect, Suspense, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, LogIn, LogOut, MessageCircle, Plus } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'

const pageComponents: Record<TabId, React.ComponentType> = {
  dashboard: Dashboard,
  calendar: CalendarPage,
  'health-log': HealthLog,
  reminders: Reminders,
  progress: ProgressPage,
  wellness: Wellness,
  profile: Profile,
  reports: Reports,
  activity: ActivityPage,
  settings: Settings,
}

export default function Home() {
  const { data: session, status: sessionStatus } = useSession()
  const {
    activeTab,
    darkMode,
    userName,
    setActiveTab,
    sidebarOpen,
    setSidebarOpen,
    toggleAIChat,
    setUserName,
  } = useAppStore()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    if (session?.user?.name) setUserName(session.user.name)
  }, [session?.user?.name, setUserName])

  const handleSidebarChange = useCallback((open: boolean) => {
    setSidebarOpen(open)
  }, [setSidebarOpen])

  const PageComponent = pageComponents[activeTab] || Dashboard

  if (sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF5F7] dark:bg-[#1A0D12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F9D0DA] border-t-[#E8788A]" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF5F7] px-5 dark:bg-[#1A0D12]">
        <section className="w-full max-w-sm rounded-lg border border-[#F9D0DA] bg-white p-6 shadow-sm dark:border-[#4A2535] dark:bg-[#2A1520]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8788A]">
              <Heart className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">NariAid</h1>
              <p className="text-sm text-[#8F5366] dark:text-[#C9A0B0]">Your private health tracker</p>
            </div>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#6B3A4A] dark:text-[#C9A0B0]">
            Sign in to securely sync your logs, reminders, calendar, and insights across devices.
          </p>
          <button
            type="button"
            onClick={() => signIn('google')}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#E8788A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#D96C80]"
          >
            <LogIn className="h-4 w-4" />
            Continue with Google
          </button>
          <p className="mt-4 text-xs leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">
            NariAid stores health information in a secured cloud database. It is not a diagnostic or emergency service.
          </p>
        </section>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-[#F9D0DA]/70 bg-white/95 backdrop-blur-xl dark:border-[#4A2535]/70 dark:bg-[#1A0D12]/95">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8788A] shadow-sm shadow-[#E8788A]/20">
              <Heart className="h-3.5 w-3.5 fill-white text-white" />
            </div>
            <span className="text-sm font-bold text-[#4A1D2E] dark:text-[#F9D0DA]">NariAid</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleAIChat}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#F9D0DA]/80 bg-white px-2.5 text-xs font-semibold text-[#8F5366] transition-colors hover:border-[#E8788A]/40 hover:text-[#E8788A] dark:border-[#4A2535] dark:bg-[#2A1520] dark:text-[#F9D0DA]"
              aria-label="Open Nari assistant"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="sm:hidden">Ask</span>
              <span className="hidden sm:inline">Ask Nari</span>
            </button>
            <NotificationCenter />
            <div className="hidden items-baseline gap-1 sm:flex">
              <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Hello,</span>
              <span className="max-w-32 truncate text-xs font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{session.user.name || userName}</span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8F5366] transition-colors hover:bg-[#FFF0F3] hover:text-[#E8788A] dark:text-[#C9A0B0] dark:hover:bg-[#3A2030]"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-12 pb-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FFF5F7] dark:bg-[#1A0D12]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F9A8D4] border-t-[#E8788A]" /></div>}>
              <PageComponent />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-4 z-50"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('health-log')}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8788A] text-white shadow-lg shadow-[#E8788A]/25"
              aria-label="Log health entry"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav onSidebarChange={handleSidebarChange} />
      <SideNav />
      <Toaster />
      <AIChat />
    </div>
  )
}
