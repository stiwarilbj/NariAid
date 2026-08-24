'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Moon,
  Palette,
  Bell,
  Download,
  Trash2,
  Info,
  Shield,
  BrainCircuit,
  Check,
  AlertTriangle,
  X,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT_COLORS = [
  { value: 'rose', gradient: 'from-[#E8788A] to-[#F9A8D4]', label: 'Rose', hex: '#E8788A' },
  { value: 'pink', gradient: 'from-[#F9A8D4] to-[#FBCFE8]', label: 'Pink', hex: '#F9A8D4' },
  { value: 'lavender', gradient: 'from-[#C084FC] to-[#DDD6FE]', label: 'Lavender', hex: '#C084FC' },
  { value: 'purple', gradient: 'from-[#A855F7] to-[#C084FC]', label: 'Purple', hex: '#A855F7' },
  { value: 'mint', gradient: 'from-[#34D399] to-[#6EE7B7]', label: 'Mint', hex: '#34D399' },
  { value: 'peach', gradient: 'from-[#FBBF24] to-[#FDE68A]', label: 'Peach', hex: '#FBBF24' },
]

const NOTIFICATION_PREFS = [
  { key: 'reminders', label: 'Reminders', description: 'Period and medication reminders' },
  { key: 'insights', label: 'Insights', description: 'Health pattern insights and analysis' },
  { key: 'dailyTips', label: 'Daily Tips', description: 'Wellness tips and self-care ideas' },
  { key: 'reports', label: 'Reports', description: 'Weekly and monthly health reports' },
]

const PRIVACY_POINTS = [
  'Your records are separated by your signed-in account and stored in the NariAid cloud database',
  'Database connections and sign-in sessions are encrypted in transit',
  'You can export your information or delete entries from your account',
  'NariAid is an informational tracker and is not a HIPAA-covered clinical record system',
  'Cloud AI only receives retrieved record excerpts after you choose to enable it',
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

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: { duration: 0.2 },
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
// Confirmation Modal (custom, NOT AlertDialog)
// ---------------------------------------------------------------------------

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#4A1D2E]/40 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 shadow-2xl max-w-sm w-full overflow-hidden"
          >
            {/* Gradient accent at top */}
            <div className="h-1 bg-gradient-to-r from-[#E8788A] via-[#F9A8D4] to-[#C084FC]" />

            <div className="p-6">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                destructive
                  ? 'bg-red-50'
                  : 'bg-[#FFF0F3] dark:bg-[#3A2030]'
              }`}>
                {destructive ? (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                ) : (
                  <Info className="w-6 h-6 text-[#E8788A]" />
                )}
              </div>

              <h3 className="text-lg font-semibold text-[#4A1D2E] dark:text-[#F9D0DA] mb-2">{title}</h3>
              <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] leading-relaxed mb-6">{description}</p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 rounded-xl border-[#F9D0DA] dark:border-[#4A2535] text-[#6B3A4A] dark:text-[#C9A0B0] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030] hover:text-[#4A1D2E] dark:text-[#F9D0DA]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  className={`flex-1 rounded-xl border-0 text-white font-medium ${
                    destructive
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20'
                      : 'bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] shadow-lg shadow-[#E8788A]/20'
                  }`}
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Main Settings Component
// ---------------------------------------------------------------------------

export default function Settings() {
  const { darkMode, setDarkMode, accentColor, setAccentColor } = useAppStore()

  // Notification preferences (local state)
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    reminders: true,
    insights: true,
    dailyTips: false,
    reports: true,
  })

  // Data management states
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearSuccess, setClearSuccess] = useState(false)
  const [cloudAiEnabled, setCloudAiEnabled] = useState(false)
  const [aiPreferenceLoading, setAiPreferenceLoading] = useState(true)
  const [consentVersion, setConsentVersion] = useState('')

  useEffect(() => {
    fetch('/api/ai-preferences', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        setCloudAiEnabled(Boolean(data.cloudAiEnabled))
        setConsentVersion(data.currentConsentVersion || data.consentVersion || '')
      })
      .finally(() => setAiPreferenceLoading(false))
  }, [])

  const handleCloudAiChange = useCallback(async (enabled: boolean) => {
    const previous = cloudAiEnabled
    setCloudAiEnabled(enabled)
    try {
      const response = await fetch('/api/ai-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloudAiEnabled: enabled, consentVersion }),
      })
      if (!response.ok) throw new Error('Preference update failed')
    } catch {
      setCloudAiEnabled(previous)
    }
  }, [cloudAiEnabled, consentVersion])

  // Toggle a notification preference
  const toggleNotification = useCallback((key: string) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // Export all data
  const handleExportData = useCallback(async () => {
    setExporting(true)
    try {
      const [healthLogsRes, wellnessRes, remindersRes, profileRes, activityRes] = await Promise.all([
        fetch('/api/health-logs'),
        fetch('/api/wellness'),
        fetch('/api/reminders'),
        fetch('/api/profile'),
        fetch('/api/activity-logs'),
      ])

      const healthLogs = healthLogsRes.ok ? await healthLogsRes.json() : []
      const wellness = wellnessRes.ok ? await wellnessRes.json() : []
      const reminders = remindersRes.ok ? await remindersRes.json() : []
      const profile = profileRes.ok ? await profileRes.json() : null
      const activities = activityRes.ok ? await activityRes.json() : []

      const exportData = {
        exportedAt: new Date().toISOString(),
        app: 'NariAid',
        version: '1.0.0',
        data: {
          profile,
          healthLogs,
          wellness,
          reminders,
          activities,
        },
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `nariaid-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)

      // Show success toast
      if (typeof window !== 'undefined') {
        const toastEvent = new CustomEvent('nariaid-toast', {
          detail: { message: 'Data exported successfully', type: 'success' },
        })
        window.dispatchEvent(toastEvent)
      }
    } catch (err) {
      console.error('Failed to export data:', err)
    } finally {
      setExporting(false)
    }
  }, [])

  // Clear all data
  const handleClearData = useCallback(async () => {
    setClearing(true)
    try {
      const response = await fetch('/api/user-data', { method: 'DELETE' })
      if (!response.ok) throw new Error('Clear failed')

      setClearSuccess(true)
      setCloudAiEnabled(false)
      setTimeout(() => setClearSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to clear data:', err)
    } finally {
      setClearing(false)
    }
  }, [])

  // Selected accent color data
  const selectedAccent = ACCENT_COLORS.find(c => c.value === accentColor) || ACCENT_COLORS[0]

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0D12] relative overflow-hidden"
    >
      {/* Decorative background blobs */}
      <div
        className="absolute top-[-60px] right-[-80px] w-[280px] h-[280px] rounded-full opacity-30 dark:opacity-15 dark:opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blob 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[300px] left-[-60px] w-[240px] h-[240px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #F9A8D4 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 10s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute bottom-[200px] right-[-40px] w-[200px] h-[200px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
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
                'radial-gradient(ellipse at 30% 30%, #C084FC 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, #F9A8D4 0%, transparent 50%)',
            }}
          />
          <div className="relative bg-white/70 dark:bg-[#2A1520]/70 backdrop-blur-md border border-[#F9D0DA]/50 dark:border-[#4A2535]/50 rounded-2xl px-6 py-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1">Customize</p>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                  <span className="gradient-text-animated">
                    Settings
                  </span>
                </h1>
                <p className="text-[#9B6B7B] dark:text-[#A07888] text-sm">
                  Make NariAid truly yours
                </p>
              </div>
              <div className="shrink-0 ml-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C084FC] to-[#E8788A] flex items-center justify-center shadow-lg shadow-[#C084FC]/15">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 2. Dark Mode Toggle                                           */}
        {/* ============================================================ */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden glass-card-hover"
        >
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#6D28D9]/15 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-[#C084FC]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Dark Mode</h2>
                  <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                    {darkMode ? 'Active -- dark theme enabled' : 'Inactive -- light theme active'}
                  </p>
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                className="data-[state=checked]:bg-[#C084FC] data-[state=unchecked]:bg-[#F9D0DA] data-[state=checked]:glow-ring"
              />
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 3. Accent Color Picker                                        */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={2} gradient="from-[#E8788A] via-[#F9A8D4] to-[#C084FC]">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <Palette className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Accent Color</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Choose your personal theme color</p>
              </div>
            </div>

            {/* Preview bar */}
            <div className="mb-4 rounded-xl overflow-hidden h-3 relative">
              <div
                className={`h-full bg-gradient-to-r ${selectedAccent.gradient} rounded-xl transition-all duration-300`}
                style={{ width: '100%' }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 rounded-xl" />
            </div>

            {/* Color grid */}
            <div className="grid grid-cols-6 gap-2">
              {ACCENT_COLORS.map((color) => (
                <motion.button
                  key={color.value}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setAccentColor(color.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1 cursor-pointer transition-all border card-press ${
                    accentColor === color.value
                      ? 'bg-[#FFF0F3] dark:bg-[#3A2030] border-[#E8788A]/40 shadow-sm'
                      : 'bg-[#FFF5F7] border-transparent hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]/60'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color.gradient} flex items-center justify-center ${
                      accentColor === color.value ? 'ring-2 ring-white shadow-md' : ''
                    }`}
                  >
                    {accentColor === color.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-medium ${
                      accentColor === color.value ? 'text-[#E8788A]' : 'text-[#9B6B7B] dark:text-[#A07888]'
                    }`}
                  >
                    {color.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 4. Notification Preferences                                   */}
        {/* ============================================================ */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden glass-card-hover"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F9A8D4]/15 to-[#E8788A]/15 flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#F9A8D4]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Notification Preferences</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Control what alerts you receive</p>
              </div>
            </div>

            <div className="space-y-0">
              {NOTIFICATION_PREFS.map((pref, idx) => (
                <div key={pref.key}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">{pref.label}</p>
                      <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] truncate">{pref.description}</p>
                    </div>
                    <Switch
                      checked={notifications[pref.key]}
                      onCheckedChange={() => toggleNotification(pref.key)}
                      className="data-[state=checked]:bg-[#E8788A] data-[state=unchecked]:bg-[#F9D0DA] shrink-0"
                    />
                  </div>
                  {idx < NOTIFICATION_PREFS.length - 1 && (
                    <Separator className="bg-[#F9D0DA]/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 5. Cloud AI                                                    */}
        {/* ============================================================ */}
        <motion.div
          custom={4}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden glass-card-hover"
        >
          <div className="px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#C084FC]/15 flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-[#E8788A]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Cloud AI for Ask Nari</h2>
                  <p className="text-xs leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">
                    {cloudAiEnabled
                      ? 'Relevant record excerpts may be sent to Google for a fuller answer.'
                      : 'Your records stay in NariAid and the private safety assistant answers.'}
                  </p>
                </div>
              </div>
              <Switch
                checked={cloudAiEnabled}
                disabled={aiPreferenceLoading || !consentVersion}
                onCheckedChange={handleCloudAiChange}
                className="data-[state=checked]:bg-[#E8788A] data-[state=unchecked]:bg-[#F9D0DA] shrink-0"
              />
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 6. Data Management                                            */}
        {/* ============================================================ */}
        <motion.div
          custom={5}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden glass-card-hover"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <Download className="w-4 h-4 text-[#C084FC]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Data Management</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Export or clear your health data</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Export All Data */}
              <div className="flex items-center justify-between p-4 bg-[#FFF5F7] rounded-xl border border-[#F9D0DA]/30 dark:border-[#4A2535]/30">
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C084FC]/20 to-[#F9A8D4]/20 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-[#C084FC]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">Export All Data</p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Download as JSON file</p>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {exportSuccess ? (
                    <motion.div
                      key="export-success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5 text-[#34D399] text-xs font-medium"
                    >
                      <Check className="w-4 h-4" />
                      Done
                    </motion.div>
                  ) : (
                    <motion.div key="export-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Button
                        onClick={handleExportData}
                        disabled={exporting}
                        size="sm"
                        className="bg-gradient-to-r from-[#C084FC] to-[#F9A8D4] hover:from-[#A855F7] hover:to-[#F0869A] text-white border-0 rounded-xl px-4 shadow-md shadow-[#C084FC]/15 btn-press"
                      >
                        {exporting ? 'Exporting...' : 'Export'}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Separator className="bg-[#F9D0DA]/30" />

              {/* Clear All Data */}
              <div className="flex items-center justify-between p-4 bg-[#FFF5F7] rounded-xl border border-red-100/60">
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#4A1D2E] dark:text-[#F9D0DA]">Clear All Data</p>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Permanently remove all records</p>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {clearSuccess ? (
                    <motion.div
                      key="clear-success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5 text-[#34D399] text-xs font-medium"
                    >
                      <Check className="w-4 h-4" />
                      Cleared
                    </motion.div>
                  ) : (
                    <motion.div key="clear-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Button
                        onClick={() => setShowClearModal(true)}
                        disabled={clearing}
                        size="sm"
                        variant="outline"
                        className="rounded-xl px-4 border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-300 btn-press"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Clear
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 7. About Section                                              */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={6} gradient="from-[#F9A8D4] via-[#C084FC] to-[#E8788A]">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F9A8D4]/15 to-[#E8788A]/15 flex items-center justify-center">
                <Info className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">About NariAid</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Empowering women through health technology</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#FFF0F3] to-[#F5F3FF] rounded-xl p-4 relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 80% 20%, #F9A8D4 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, #C084FC 0%, transparent 50%)',
                }}
              />
              <div className="relative">
                <p className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] leading-relaxed mb-3">
                  NariAid is dedicated to empowering women through every stage of their health
                  journey. Our mission is to provide intelligent, compassionate tools that help you
                  understand your body, track patterns, and make informed decisions about your
                  well-being.
                </p>
                <Separator className="bg-[#F9D0DA]/40 my-3" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-[#E8788A] bg-[#E8788A]/10 px-2 py-0.5 rounded-md">
                      v1.0.0
                    </span>
                    <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">
                      Built with Next.js & React
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                    <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Stable</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 8. Privacy & Security                                         */}
        {/* ============================================================ */}
        <motion.div
          custom={7}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden glass-card-hover"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#C084FC]/15 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Privacy & Security</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">How we protect your health data</p>
              </div>
            </div>

            <div className="space-y-3">
              {PRIVACY_POINTS.map((point, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1, duration: 0.3 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#E8788A]/10 to-[#C084FC]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-[#E8788A]" />
                  </div>
                  <p className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0] leading-relaxed">{point}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>

      {/* ============================================================ */}
      {/* Custom Confirmation Modal for Clear Data                      */}
      {/* ============================================================ */}
      <ConfirmModal
        open={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearData}
        title="Clear All Data"
        description="This permanently deletes your health logs, wellness entries, reminders, calendar events, activity, chats, AI preferences, and retrieval index. Your sign-in account stays active. This cannot be undone."
        confirmLabel={clearing ? 'Clearing...' : 'Clear All Data'}
        destructive
      />
    </motion.div>
  )
}
