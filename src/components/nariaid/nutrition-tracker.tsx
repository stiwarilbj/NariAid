'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Apple,
  Plus,
  Coffee,
  UtensilsCrossed,
  Salad,
  Cherry,
  Milk,
  Wheat,
  Droplets,
  Check,
  X,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NutritionTrackerProps {
  phase: string
}

interface Meal {
  id: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string
  time: string
  foodGroups: string[]
}

interface FoodGroupConfig {
  key: string
  label: string
  color: string
  darkBg: string
  target: number
  icon: typeof Apple
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEAL_TYPES = [
  { value: 'breakfast' as const, label: 'Breakfast', icon: Coffee, color: '#FBBF24' },
  { value: 'lunch' as const, label: 'Lunch', icon: Salad, color: '#34D399' },
  { value: 'dinner' as const, label: 'Dinner', icon: UtensilsCrossed, color: '#E8788A' },
  { value: 'snack' as const, label: 'Snack', icon: Cherry, color: '#C084FC' },
]

const FOOD_GROUPS: FoodGroupConfig[] = [
  { key: 'protein', label: 'Protein', color: '#E8788A', darkBg: '#4A2535', target: 3, icon: Apple },
  { key: 'vegetables', label: 'Vegetables', color: '#34D399', darkBg: '#1A3025', target: 4, icon: Salad },
  { key: 'fruits', label: 'Fruits', color: '#FBBF24', darkBg: '#3A2A10', target: 3, icon: Cherry },
  { key: 'grains', label: 'Grains', color: '#F9A8D4', darkBg: '#3A2030', target: 4, icon: Wheat },
  { key: 'dairy', label: 'Dairy', color: '#60A5FA', darkBg: '#1A2540', target: 2, icon: Milk },
  { key: 'hydration', label: 'Hydration', color: '#C084FC', darkBg: '#2A1A30', target: 8, icon: Droplets },
]

const phaseNutritionTips: Record<string, { title: string; description: string }> = {
  Menstrual: {
    title: 'Iron-Rich Recovery',
    description: 'Focus on iron-rich foods like leafy greens, lentils, and dark chocolate to replenish what your body loses during this phase.',
  },
  Follicular: {
    title: 'Energizing Fuel',
    description: 'Your metabolism begins to rise. Include complex carbs, fresh vegetables, and light proteins to support increasing energy needs.',
  },
  Ovulation: {
    title: 'Nutrient-Dense Peak',
    description: 'Peak energy demands nutrient diversity. Include colorful vegetables, healthy fats, and antioxidant-rich fruits to support this active phase.',
  },
  Luteal: {
    title: 'Comfort & Balance',
    description: 'Cravings may increase due to progesterone. Choose complex carbs, magnesium-rich foods, and warm meals to satisfy cravings healthily.',
  },
}

const defaultTip = {
  title: 'Balanced Nutrition',
  description: 'Set up your cycle in Profile for phase-specific nutrition guidance tailored to your hormonal needs.',
}

const INITIAL_MEALS: Meal[] = [
  {
    id: '1',
    type: 'breakfast',
    description: 'Oatmeal with berries and honey',
    time: '08:00',
    foodGroups: ['grains', 'fruits'],
  },
  {
    id: 'lunch-1',
    type: 'lunch',
    description: 'Grilled chicken salad with quinoa',
    time: '12:30',
    foodGroups: ['protein', 'vegetables', 'grains'],
  },
]

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
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
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

const mealVariants = {
  hidden: { opacity: 0, x: -16, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    x: 16,
    scale: 0.95,
    transition: { duration: 0.25 },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NutritionTracker({ phase }: NutritionTrackerProps) {
  const [meals, setMeals] = useState<Meal[]>(INITIAL_MEALS)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMealType, setNewMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [newDescription, setNewDescription] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  // Calculate food group counts from all meals
  const foodGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    FOOD_GROUPS.forEach((fg) => {
      counts[fg.key] = 0
    })
    meals.forEach((meal) => {
      meal.foodGroups.forEach((fg) => {
        if (counts[fg] !== undefined) counts[fg]++
      })
    })
    return counts
  }, [meals])

  // Calculate nutrition score (0-100) based on food group balance
  const nutritionScore = useMemo(() => {
    let score = 0
    const maxScore = FOOD_GROUPS.length
    FOOD_GROUPS.forEach((fg) => {
      const ratio = Math.min(foodGroupCounts[fg.key] / fg.target, 1)
      score += ratio
    })
    return Math.round((score / maxScore) * 100)
  }, [foodGroupCounts])

  // Get score label and color
  const scoreLabel =
    nutritionScore >= 80 ? 'Excellent' :
    nutritionScore >= 60 ? 'Good' :
    nutritionScore >= 40 ? 'Fair' : 'Needs Work'
  const scoreColor =
    nutritionScore >= 80 ? '#34D399' :
    nutritionScore >= 60 ? '#C084FC' :
    nutritionScore >= 40 ? '#FBBF24' : '#E8788A'

  // SVG ring parameters
  const ringRadius = 38
  const ringStroke = 5
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringProgress = (nutritionScore / 100) * ringCircumference

  // Phase nutrition tip
  const nutritionTip = phaseNutritionTips[phase] ?? defaultTip
  const phaseColor =
    phase === 'Menstrual' ? '#E8788A' :
    phase === 'Follicular' ? '#F9A8D4' :
    phase === 'Ovulation' ? '#C084FC' :
    phase === 'Luteal' ? '#FDA4AF' : '#C084FC'

  // Toggle food group selection
  const toggleGroup = (key: string) => {
    setSelectedGroups((prev) =>
      prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]
    )
  }

  // Add meal
  const handleAddMeal = () => {
    if (!newDescription.trim()) return

    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const newMeal: Meal = {
      id: `meal-${Date.now()}`,
      type: newMealType,
      description: newDescription.trim(),
      time: timeStr,
      foodGroups: selectedGroups,
    }

    setMeals((prev) => [...prev, newMeal])
    setNewDescription('')
    setSelectedGroups([])
    setShowAddForm(false)
  }

  // Remove meal
  const handleRemoveMeal = (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }

  // Get meal type config
  const getMealConfig = (type: string) =>
    MEAL_TYPES.find((m) => m.value === type) ?? MEAL_TYPES[0]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-[#34D399] via-[#F9A8D4] to-[#FBBF24]"
    >
      <div className="bg-white dark:bg-[#2A1520] rounded-[14px] h-full overflow-hidden">
        <div className="px-5 sm:px-6 py-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#34D399]/15 to-[#F9A8D4]/15 flex items-center justify-center">
                <Apple className="w-4 h-4 text-[#34D399]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">
                  Nutrition Tracker
                </h2>
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                  Track your daily food intake
                </p>
              </div>
            </div>

            {/* Add Meal button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#34D399] to-[#F9A8D4] hover:from-[#2BB583] hover:to-[#E098C4] text-white text-xs font-medium rounded-xl px-3.5 py-2 shadow-sm shadow-[#34D399]/20 transition-colors"
            >
              {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showAddForm ? 'Cancel' : 'Add Meal'}
            </motion.button>
          </div>

          {/* Nutrition Score + Food Groups */}
          <motion.div variants={itemVariants} className="flex gap-4 mb-5">
            {/* Circular Score */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative">
                <svg width="88" height="88" className="-rotate-90">
                  <defs>
                    <linearGradient id="nutritionScoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#34D399" />
                      <stop offset="50%" stopColor="#F9A8D4" />
                      <stop offset="100%" stopColor="#FBBF24" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="44"
                    cy="44"
                    r={ringRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={ringStroke}
                    className="text-[#F5F3FF] dark:text-[#2A1A30]"
                  />
                  <motion.circle
                    cx="44"
                    cy="44"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#nutritionScoreGrad)"
                    strokeWidth={ringStroke}
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    initial={{ strokeDashoffset: ringCircumference }}
                    animate={{ strokeDashoffset: ringCircumference - ringProgress }}
                    transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay: 0.3 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold" style={{ color: scoreColor }}>
                    {nutritionScore}
                  </span>
                  <span className="text-[8px] text-[#9B6B7B] dark:text-[#A07888] leading-none mt-0.5">
                    {scoreLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Food Group Progress Bars */}
            <div className="flex-1 space-y-2">
              {FOOD_GROUPS.map((fg) => {
                const count = foodGroupCounts[fg.key] ?? 0
                const pct = Math.min((count / fg.target) * 100, 100)
                const IconComp = fg.icon
                return (
                  <div key={fg.key} className="flex items-center gap-2">
                    <IconComp className="w-3 h-3 shrink-0" style={{ color: fg.color }} />
                    <div className="flex-1 h-2.5 rounded-full bg-[#F5F3FF] dark:bg-[#2A1A30] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: fg.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay: 0.4 }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-[#6B3A4A] dark:text-[#C9A0B0] w-8 text-right shrink-0">
                      {count}/{fg.target}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Meal Timeline */}
          <motion.div variants={itemVariants} className="mb-4">
            <p className="text-xs text-[#9B6B7B] dark:text-[#A07888] font-medium mb-2.5">
              Today&apos;s Meals
            </p>

            {meals.length === 0 ? (
              <div className="text-center py-6 bg-[#FFF5F7] dark:bg-[#1A0D12] rounded-xl">
                <Apple className="w-6 h-6 text-[#F9A8D4] mx-auto mb-2" />
                <p className="text-xs text-[#9B6B7B] dark:text-[#A07888]">
                  No meals logged yet
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                <AnimatePresence mode="popLayout">
                  {meals.map((meal) => {
                    const config = getMealConfig(meal.type)
                    const MealIcon = config.icon
                    return (
                      <motion.div
                        key={meal.id}
                        variants={mealVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="flex items-start gap-2.5 bg-gradient-to-r from-[#FFF0F3]/60 dark:from-[#3A2030]/60 to-[#FFF5F7]/40 dark:to-[#2A1520]/40 rounded-xl p-3 group"
                      >
                        {/* Meal type icon */}
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${config.color}18` }}
                        >
                          <MealIcon className="w-3.5 h-3.5" style={{ color: config.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                              style={{
                                backgroundColor: `${config.color}15`,
                                color: config.color,
                              }}
                            >
                              {config.label}
                            </span>
                            <span className="text-[10px] text-[#9B6B7B] dark:text-[#A07888]">
                              {meal.time}
                            </span>
                          </div>
                          <p className="text-xs text-[#4A1D2E] dark:text-[#F9D0DA] mt-1 leading-relaxed truncate">
                            {meal.description}
                          </p>
                          {meal.foodGroups.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {meal.foodGroups.map((fg) => {
                                const fgConfig = FOOD_GROUPS.find((f) => f.key === fg)
                                if (!fgConfig) return null
                                const FgIcon = fgConfig.icon
                                return (
                                  <span
                                    key={fg}
                                    className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-md font-medium"
                                    style={{
                                      backgroundColor: `${fgConfig.color}12`,
                                      color: fgConfig.color,
                                    }}
                                  >
                                    <FgIcon className="w-2 h-2" />
                                    {fgConfig.label}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Remove button */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveMeal(meal.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-md bg-[#F9D0DA]/30 dark:bg-[#4A2535]/30 flex items-center justify-center shrink-0"
                        >
                          <X className="w-2.5 h-2.5 text-[#E8788A]" />
                        </motion.button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Add Meal Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                className="overflow-hidden"
              >
                <div className="bg-[#FFF0F3]/50 dark:bg-[#3A2030]/50 rounded-xl p-4 space-y-3">
                  {/* Meal type selector */}
                  <div>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] font-medium mb-2">
                      Meal Type
                    </p>
                    <div className="flex gap-2">
                      {MEAL_TYPES.map((mt) => {
                        const isSelected = newMealType === mt.value
                        const MtIcon = mt.icon
                        return (
                          <motion.button
                            key={mt.value}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setNewMealType(mt.value)}
                            className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                            style={{
                              backgroundColor: isSelected ? `${mt.color}20` : 'transparent',
                              color: isSelected ? mt.color : '#9B6B7B',
                              border: isSelected ? `1px solid ${mt.color}40` : '1px solid transparent',
                            }}
                          >
                            <MtIcon className="w-3 h-3" />
                            {mt.label}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Description input */}
                  <div>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] font-medium mb-1.5">
                      What did you eat?
                    </p>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="e.g., Greek yogurt with granola and berries"
                      className="w-full bg-white dark:bg-[#2A1520] border border-[#F9D0DA]/60 dark:border-[#4A2535]/60 rounded-lg px-3 py-2 text-xs text-[#4A1D2E] dark:text-[#F9D0DA] placeholder:text-[#9B6B7B]/50 dark:placeholder:text-[#A07888]/50 focus:border-[#E8788A] dark:focus:border-[#F0869A] focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Food group selector */}
                  <div>
                    <p className="text-[10px] text-[#9B6B7B] dark:text-[#A07888] font-medium mb-2">
                      Food Groups
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {FOOD_GROUPS.map((fg) => {
                        const isSelected = selectedGroups.includes(fg.key)
                        const FgIcon = fg.icon
                        return (
                          <motion.button
                            key={fg.key}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleGroup(fg.key)}
                            className="flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded-md transition-all"
                            style={{
                              backgroundColor: isSelected ? `${fg.color}18` : 'transparent',
                              color: isSelected ? fg.color : '#9B6B7B',
                              border: isSelected ? `1px solid ${fg.color}40` : '1px solid #F9D0DA30',
                            }}
                          >
                            {isSelected ? <Check className="w-2 h-2" /> : <FgIcon className="w-2 h-2" />}
                            {fg.label}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Save button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddMeal}
                    disabled={!newDescription.trim()}
                    className="w-full bg-gradient-to-r from-[#34D399] to-[#F9A8D4] hover:from-[#2BB583] hover:to-[#E098C4] disabled:from-[#F9D0DA] disabled:to-[#F9D0DA] disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg px-4 py-2.5 shadow-sm transition-colors"
                  >
                    Save Meal
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase-based Nutrition Tip */}
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl mt-4">
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
              style={{
                background: `linear-gradient(180deg, ${phaseColor}, ${phaseColor}60)`,
              }}
            />
            <div
              className="pl-4 pr-3 py-3.5 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${phaseColor}10 0%, ${phaseColor}05 60%, transparent 100%)`,
              }}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${phaseColor}20, ${phaseColor}08)`,
                  }}
                >
                  <Apple className="w-3.5 h-3.5" style={{ color: phaseColor }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: phaseColor }}>
                    {nutritionTip.title}
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#9B6B7B] dark:text-[#A07888]">
                    {nutritionTip.description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
