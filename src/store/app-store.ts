import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type TabId = 'dashboard' | 'calendar' | 'health-log' | 'reminders' | 'progress' | 'wellness' | 'profile' | 'reports' | 'activity' | 'settings'
export type DashboardDensity = 'comfortable' | 'compact'
export type DashboardSection = 'today' | 'insights' | 'tools'
export type DashboardWidgetId =
  | 'daily-tip'
  | 'check-in'
  | 'health-score'
  | 'today-summary'
  | 'period-countdown'
  | 'health-guidance'
  | 'reminders'
  | 'weekly-trends'
  | 'mood-heatmap'
  | 'ai-insights'
  | 'cycle-overview'
  | 'recommendations'
  | 'journal'
  | 'phase-note'
  | 'hydration'
  | 'medication'
  | 'symptoms'
  | 'sleep'
  | 'nutrition'
  | 'quick-actions'

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetId[] = [
  'check-in',
  'health-score',
  'period-countdown',
  'health-guidance',
  'reminders',
  'ai-insights',
  'weekly-trends',
  'cycle-overview',
  'hydration',
  'symptoms',
]

interface AppState {
  activeTab: TabId
  sidebarOpen: boolean
  darkMode: boolean
  accentColor: string
  userName: string
  aiChatOpen: boolean
  dashboardDensity: DashboardDensity
  visibleDashboardWidgets: DashboardWidgetId[]
  activeDashboardSection: DashboardSection
  dashboardSchemaVersion: number
  setActiveTab: (tab: TabId) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setDarkMode: (dark: boolean) => void
  setAccentColor: (color: string) => void
  setUserName: (name: string) => void
  setAIChatOpen: (open: boolean) => void
  toggleAIChat: () => void
  setDashboardDensity: (density: DashboardDensity) => void
  setVisibleDashboardWidgets: (widgets: DashboardWidgetId[]) => void
  toggleDashboardWidget: (widget: DashboardWidgetId) => void
  setActiveDashboardSection: (section: DashboardSection) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      sidebarOpen: false,
      darkMode: false,
      accentColor: 'rose',
      userName: 'User',
      aiChatOpen: false,
      dashboardDensity: 'comfortable',
      visibleDashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
      activeDashboardSection: 'today',
      dashboardSchemaVersion: 2,
      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setDarkMode: (dark) => {
        if (typeof document !== 'undefined') {
          if (dark) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        }
        set({ darkMode: dark })
      },
      setAccentColor: (color) => set({ accentColor: color }),
      setUserName: (name) => set({ userName: name }),
      setAIChatOpen: (open) => set({ aiChatOpen: open }),
      toggleAIChat: () => set((state) => ({ aiChatOpen: !state.aiChatOpen })),
      setDashboardDensity: (density) => set({ dashboardDensity: density }),
      setVisibleDashboardWidgets: (widgets) => set({ visibleDashboardWidgets: widgets }),
      toggleDashboardWidget: (widget) =>
        set((state) => {
          const visible = state.visibleDashboardWidgets.includes(widget)
          return {
            visibleDashboardWidgets: visible
              ? state.visibleDashboardWidgets.filter((item) => item !== widget)
              : [...state.visibleDashboardWidgets, widget],
          }
        }),
      setActiveDashboardSection: (section) => set({ activeDashboardSection: section }),
    }),
    {
      name: 'nariaid-ui-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        darkMode: state.darkMode,
        accentColor: state.accentColor,
        userName: state.userName,
        dashboardDensity: state.dashboardDensity,
        visibleDashboardWidgets: state.visibleDashboardWidgets,
        activeDashboardSection: state.activeDashboardSection,
        dashboardSchemaVersion: state.dashboardSchemaVersion,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AppState>),
        visibleDashboardWidgets: (() => {
          const saved = persisted as Partial<AppState> | undefined
          const widgets = saved?.visibleDashboardWidgets
          const base = widgets?.length && widgets.length <= DEFAULT_DASHBOARD_WIDGETS.length
            ? widgets
            : DEFAULT_DASHBOARD_WIDGETS
          if (saved?.dashboardSchemaVersion === 2) return base
          return Array.from(new Set([...base, 'health-guidance' as DashboardWidgetId]))
        })(),
        dashboardSchemaVersion: 2,
      }),
    }
  )
)
