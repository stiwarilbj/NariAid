'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Settings2,
  CalendarDays,
  Palette,
  Target,
  Eye,
  Save,
  MapPin,
  Heart,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileData {
  id: string
  name: string
  email: string
  age: number
  lifeStage: string
  bio: string
  location: string
  cycleLength: number
  lastPeriodStart: string
  avatarColor: string
  healthGoals: string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIFE_STAGES = [
  'Pre-menstrual',
  'Reproductive',
  'Perimenopause',
  'Menopause',
  'Post-menopause',
]

const AVATAR_COLORS = [
  { value: 'rose', gradient: 'from-[#E8788A] to-[#F9A8D4]', label: 'Rose' },
  { value: 'pink', gradient: 'from-[#F9A8D4] to-[#FBCFE8]', label: 'Pink' },
  { value: 'lavender', gradient: 'from-[#C084FC] to-[#DDD6FE]', label: 'Lavender' },
  { value: 'purple', gradient: 'from-[#A855F7] to-[#C084FC]', label: 'Purple' },
  { value: 'mint', gradient: 'from-[#34D399] to-[#6EE7B7]', label: 'Mint' },
  { value: 'peach', gradient: 'from-[#FBBF24] to-[#FDE68A]', label: 'Peach' },
  { value: 'sky', gradient: 'from-[#60A5FA] to-[#93C5FD]', label: 'Sky' },
  { value: 'coral', gradient: 'from-[#FB7185] to-[#FDA4AF]', label: 'Coral' },
]

const HEALTH_GOALS = [
  { value: 'better-sleep', label: 'Better Sleep', icon: 'moon' },
  { value: 'reduce-stress', label: 'Reduce Stress', icon: 'wind' },
  { value: 'track-symptoms', label: 'Track Symptoms', icon: 'clipboard' },
  { value: 'weight-management', label: 'Weight Management', icon: 'scale' },
  { value: 'hormonal-balance', label: 'Hormonal Balance', icon: 'droplets' },
  { value: 'fitness', label: 'Fitness', icon: 'dumbbell' },
  { value: 'mental-wellness', label: 'Mental Wellness', icon: 'brain' },
  { value: 'nutrition', label: 'Nutrition', icon: 'apple' },
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
// Main Profile Component
// ---------------------------------------------------------------------------

export default function Profile() {
  const { userName, setUserName } = useAppStore()

  // ---- Data state ----
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ---- Form state ----
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [lifeStage, setLifeStage] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [cycleLength, setCycleLength] = useState(28)
  const [lastPeriodStart, setLastPeriodStart] = useState('')
  const [avatarColor, setAvatarColor] = useState('rose')
  const [healthGoals, setHealthGoals] = useState<string[]>([])

  // ---- Fetch data ----
  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setName(data.name || '')
        setEmail(data.email || '')
        setAge(data.age?.toString() || '')
        setLifeStage(data.lifeStage || '')
        setBio(data.bio || '')
        setLocation(data.location || '')
        setCycleLength(data.cycleLength || 28)
        setLastPeriodStart(data.lastPeriodStart || '')
        setAvatarColor(data.avatarColor || 'rose')
        setHealthGoals(Array.isArray(data.healthGoals) ? data.healthGoals : [])
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // ---- Toggle health goal ----
  const toggleGoal = useCallback((goal: string) => {
    setHealthGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    )
  }, [])

  // ---- Submit profile ----
  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      const payload = {
        name,
        email,
        age: age ? parseInt(age) : 25,
        lifeStage,
        bio,
        location,
        cycleLength,
        lastPeriodStart,
        avatarColor,
        healthGoals,
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        if (name) setUserName(name)
        const updated = await res.json()
        setProfile(updated)
      }
    } catch (err) {
      console.error('Failed to save profile:', err)
    } finally {
      setSaving(false)
    }
  }, [name, email, age, lifeStage, bio, location, cycleLength, lastPeriodStart, avatarColor, healthGoals, setUserName])

  // ---- Derived data ----
  const selectedAvatar = AVATAR_COLORS.find(c => c.value === avatarColor) || AVATAR_COLORS[0]
  const displayName = name || userName || 'User'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

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
        className="absolute top-[-60px] left-[-80px] w-[280px] h-[280px] rounded-full opacity-30 dark:opacity-15 dark:opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blob 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[250px] right-[-60px] w-[240px] h-[240px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #F9A8D4 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'blob 10s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute bottom-[300px] left-[-40px] w-[200px] h-[200px] rounded-full opacity-20 dark:opacity-10 pointer-events-none"
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
                <p className="text-sm text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1">Personalize</p>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                  <span className="gradient-text-animated">Profile</span>
                </h1>
                <p className="text-[#9B6B7B] dark:text-[#A07888] text-sm">
                  Your identity, preferences, and health journey
                </p>
              </div>
              <div className="shrink-0 ml-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C084FC] to-[#F9A8D4] flex items-center justify-center shadow-lg shadow-[#C084FC]/15">
                  <User className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 2. Avatar Selection                                           */}
        {/* ============================================================ */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F9A8D4]/15 to-[#C084FC]/15 flex items-center justify-center">
                <Palette className="w-4 h-4 text-[#F9A8D4]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Avatar Color</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Choose your personal accent</p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              {/* Preview avatar */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedAvatar.gradient} flex items-center justify-center shadow-lg shrink-0 animated-gradient-border`}>
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>

              {/* Color grid */}
              <div className="grid grid-cols-4 gap-2.5 flex-1">
                {AVATAR_COLORS.map((color) => (
                  <motion.button
                    key={color.value}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setAvatarColor(color.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-2 cursor-pointer transition-all border card-press ${
                      avatarColor === color.value
                        ? 'bg-[#FFF0F3] dark:bg-[#3A2030] border-[#E8788A]/40 shadow-sm'
                        : 'bg-[#FFF5F7] border-transparent hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color.gradient} flex items-center justify-center ${avatarColor === color.value ? 'ring-2 ring-white shadow-md' : ''}`}>
                      {avatarColor === color.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                      )}
                    </div>
                    <span className={`text-[9px] font-medium ${avatarColor === color.value ? 'text-[#E8788A]' : 'text-[#9B6B7B] dark:text-[#A07888]'}`}>
                      {color.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 3. User Profile Form                                          */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={2} gradient="from-[#E8788A] via-[#F9A8D4] to-[#FDA4AF]">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <User className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Personal Information</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Tell us about yourself</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Name</Label>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10 input-focus-ring"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Email</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10 input-focus-ring"
                />
              </div>

              {/* Age & Life Stage row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Age</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 30"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    min={10}
                    max={100}
                    className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10 input-focus-ring"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Life Stage</Label>
                  <Select value={lifeStage} onValueChange={setLifeStage}>
                    <SelectTrigger className="w-full rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535]">
                      {LIFE_STAGES.map(stage => (
                        <SelectItem key={stage} value={stage} className="text-[#4A1D2E] dark:text-[#F9D0DA]">
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Bio</Label>
                <Textarea
                  placeholder="A few words about yourself..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] min-h-[80px] resize-y"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#9B6B7B] dark:text-[#A07888]" />
                  Location
                </Label>
                <Input
                  placeholder="City, Country"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10 input-focus-ring"
                />
              </div>
            </div>
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 4. Cycle Settings                                             */}
        {/* ============================================================ */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C084FC]/15 to-[#E8788A]/15 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-[#C084FC]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Cycle Settings</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Personalize your cycle tracking</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Cycle Length Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Cycle Length</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9B6B7B] dark:text-[#A07888]">days</span>
                    <motion.span
                      key={cycleLength}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                      className="text-lg font-bold text-[#C084FC] w-8 text-right"
                    >
                      {cycleLength}
                    </motion.span>
                  </div>
                </div>
                <Slider
                  value={[cycleLength]}
                  min={21}
                  max={35}
                  step={1}
                  onValueChange={(val) => setCycleLength(val[0])}
                  className="w-full [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-gradient-to-r [&_[data-slot=slider-track]]:from-[#F9D0DA] [&_[data-slot=slider-track]]:to-[#C084FC]/30 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#C084FC] [&_[data-slot=slider-range]]:to-[#F9A8D4] [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:border-[#C084FC] [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:shadow-[#C084FC]/20"
                />
                <div className="flex items-center justify-between text-[10px] text-[#9B6B7B] dark:text-[#A07888]">
                  <span>21 days</span>
                  <span>Average: 28</span>
                  <span>35 days</span>
                </div>
              </div>

              {/* Last Period Start Date */}
              <div className="space-y-2">
                <Label className="text-sm text-[#6B3A4A] dark:text-[#C9A0B0] font-medium">Last Period Start</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B6B7B] dark:text-[#A07888]" />
                  <Input
                    type="date"
                    value={lastPeriodStart}
                    onChange={e => setLastPeriodStart(e.target.value)}
                    className="pl-9 rounded-xl border-[#F9D0DA] dark:border-[#4A2535] bg-[#FFF5F7] dark:bg-[#2A1520] focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:ring-[#E8788A]/20 dark:focus:ring-[#F0869A]/20 text-[#4A1D2E] dark:text-[#F9D0DA] h-10 input-focus-ring"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* 5. Health Goals                                               */}
        {/* ============================================================ */}
        <GradientBorderCard animateIndex={4} gradient="from-[#F9A8D4] via-[#C084FC] to-[#E8788A]" className="glass-card-hover">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F9A8D4]/15 to-[#E8788A]/15 flex items-center justify-center">
                <Target className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Health Goals</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">Select what matters most to you</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {HEALTH_GOALS.map((goal) => {
                const isSelected = healthGoals.includes(goal.value)
                return (
                  <motion.button
                    key={goal.value}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => toggleGoal(goal.value)}
                    className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 cursor-pointer transition-all border text-left card-press ${
                      isSelected
                        ? 'bg-[#FFF0F3] dark:bg-[#3A2030] border-[#E8788A]/40 shadow-sm'
                        : 'bg-[#FFF5F7] border-[#F9D0DA]/40 dark:border-[#4A2535]/40 hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030] dark:bg-[#3A2030]/60'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#E8788A] to-[#F9A8D4]'
                          : 'bg-[#F9D0DA]/30'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#9B6B7B] dark:text-[#A07888]'}`} />
                    </div>
                    <span className={`text-xs font-medium ${isSelected ? 'text-[#E8788A]' : 'text-[#9B6B7B] dark:text-[#A07888]'}`}>
                      {goal.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            {healthGoals.length > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Selected:</span>
                {healthGoals.map(goal => {
                  const goalData = HEALTH_GOALS.find(g => g.value === goal)
                  return (
                    <Badge
                      key={goal}
                      className="text-[10px] px-2 py-0.5 bg-[#FFF0F3] dark:bg-[#3A2030] text-[#E8788A] border-0 rounded-md font-medium"
                    >
                      {goalData?.label || goal}
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
        </GradientBorderCard>

        {/* ============================================================ */}
        {/* 6. Save Button                                                */}
        {/* ============================================================ */}
        <motion.div
          custom={5}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="flex justify-center"
        >
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 text-[#E8788A] font-medium"
              >
                <Sparkles className="w-5 h-5" />
                Profile Saved!
              </motion.div>
            ) : (
              <motion.div key="save-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#E8788A] to-[#F0869A] hover:from-[#D66A7C] hover:to-[#E8788A] text-white border-0 rounded-xl px-8 py-2.5 text-sm font-medium shadow-lg shadow-[#E8788A]/20 h-auto btn-press"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ============================================================ */}
        {/* 7. Profile Preview Card                                       */}
        {/* ============================================================ */}
        <motion.div
          custom={6}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white dark:bg-[#2A1520] rounded-2xl border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 overflow-hidden glass-card-hover"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8788A]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <Eye className="w-4 h-4 text-[#E8788A]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Profile Preview</h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">How your profile appears</p>
              </div>
            </div>

            {/* Preview card */}
            <div className="relative bg-gradient-to-br from-[#FFF0F3] to-[#F5F3FF] rounded-xl overflow-hidden">
              <div
                className="absolute inset-0 opacity-30 dark:opacity-15 dark:opacity-5 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 80% 20%, #F9A8D4 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, #C084FC 0%, transparent 50%)',
                }}
              />
              <div className="relative p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedAvatar.gradient} flex items-center justify-center shadow-lg`}>
                    <span className="text-lg font-bold text-white">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-[#4A1D2E] dark:text-[#F9D0DA] truncate">
                      {displayName}
                    </h3>
                    {email && (
                      <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] truncate">{email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {lifeStage && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-[#E8788A]/15 text-[#E8788A] border-0 rounded-md font-medium">
                          {lifeStage}
                        </Badge>
                      )}
                      {age && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-[#C084FC]/15 text-[#C084FC] border-0 rounded-md font-medium">
                          Age {age}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {bio && (
                  <p className="text-xs text-[#6B3A4A] dark:text-[#C9A0B0] leading-relaxed mb-3 line-clamp-2">{bio}</p>
                )}

                {location && (
                  <div className="flex items-center gap-1.5 text-xs text-[#9B6B7B] dark:text-[#A07888] mb-3">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-[#9B6B7B] dark:text-[#A07888]">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-[#C084FC]" />
                    <span>{cycleLength}-day cycle</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-[#F9D0DA]" />
                  <div className="flex-1" />
                </div>

                {healthGoals.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#F9D0DA]/30 dark:border-[#4A2535]/30 flex items-center gap-1.5 flex-wrap">
                    <Target className="w-3 h-3 text-[#E8788A] shrink-0" />
                    {healthGoals.slice(0, 4).map(goal => {
                      const goalData = HEALTH_GOALS.find(g => g.value === goal)
                      return (
                        <span key={goal} className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] bg-white/60 dark:bg-[#2A1520]/60 rounded-md px-1.5 py-0.5">
                          {goalData?.label || goal}
                        </span>
                      )
                    })}
                    {healthGoals.length > 4 && (
                      <span className="text-[10px] text-[#E8788A]">+{healthGoals.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  )
}
