import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConsumptionGranularity, EnergyComponentKey, TimeRange } from '../api/types'
import { getDefaultTimeRange } from '../api/mockApi'

export type DeviceFormFactor = 'desktop' | 'mobile'
export type DeviceOrientation = 'portrait' | 'landscape'
export type DeviceProfileKey = 'desktop' | 'mobile-portrait' | 'mobile-landscape'

export type DashboardSection =
  | 'overview'
  | 'consumption'
  | 'aggregations'
  | 'forecast'
  | 'nowcast'
  | 'invoices'
  | 'alerts'

export type SectionVisibilityConfig = {
  [section in DashboardSection]: boolean
}

export interface TimeRangePreset {
  id: string
  label: string
  description: string
  getRange: () => TimeRange
  suggestedGranularity: ConsumptionGranularity
}

export const TIME_RANGE_PRESETS: TimeRangePreset[] = [
  {
    id: 'last_60m',
    label: 'Last 1h',
    description: 'Most recent 60 minutes',
    getRange: () => {
      const to = new Date()
      const from = new Date(to.getTime() - 60 * 60 * 1000)
      return { from: from.toISOString(), to: to.toISOString() }
    },
    suggestedGranularity: 'minute',
  },
  {
    id: 'today',
    label: 'Today',
    description: 'Midnight to now',
    getRange: () => {
      const to = new Date()
      const from = new Date(to)
      from.setHours(0, 0, 0, 0)
      return { from: from.toISOString(), to: to.toISOString() }
    },
    suggestedGranularity: 'minute',
  },
  {
    id: 'this_week',
    label: 'This week',
    description: 'Monday 0:00 to now',
    getRange: () => {
      const to = new Date()
      const from = new Date(to)
      const day = from.getDay()
      const diff = from.getDate() - day + (day === 0 ? -6 : 1)
      from.setDate(diff)
      from.setHours(0, 0, 0, 0)
      return { from: from.toISOString(), to: to.toISOString() }
    },
    suggestedGranularity: 'hour',
  },
  {
    id: 'this_month',
    label: 'This month',
    description: 'First day of the month to now',
    getRange: () => {
      const to = new Date()
      const from = new Date(to.getFullYear(), to.getMonth(), 1)
      return { from: from.toISOString(), to: to.toISOString() }
    },
    suggestedGranularity: 'day',
  },
  {
    id: 'last_90d',
    label: 'Last 90 days',
    description: 'Rolling quarter',
    getRange: () => {
      const to = new Date()
      const from = new Date(to)
      from.setDate(from.getDate() - 90)
      return { from: from.toISOString(), to: to.toISOString() }
    },
    suggestedGranularity: 'day',
  },
  {
    id: 'year_to_date',
    label: 'Year to date',
    description: 'January 1st to now',
    getRange: () => {
      const to = new Date()
      const from = new Date(to.getFullYear(), 0, 1)
      return { from: from.toISOString(), to: to.toISOString() }
    },
    suggestedGranularity: 'week',
  },
]

export interface DashboardState {
  timeRange: TimeRange
  selectedPresetId: string | null
  granularity: ConsumptionGranularity
  componentFilters: EnergyComponentKey[]
  householdZoneFilters: string[]
  deviceFormFactor: DeviceFormFactor
  deviceOrientation: DeviceOrientation
  sectionVisibility: Record<DeviceProfileKey, SectionVisibilityConfig>
  pinnedComparisons: string[]
  activeDashboard: 'overview' | 'monthly' | 'custom'

  setTimeRange: (range: TimeRange, presetId?: string | null) => void
  setGranularity: (granularity: ConsumptionGranularity) => void
  toggleComponentFilter: (component: EnergyComponentKey) => void
  toggleHouseholdZone: (zone: string) => void
  clearFilters: () => void
  setDeviceProfile: (formFactor: DeviceFormFactor, orientation: DeviceOrientation) => void
  setSectionVisibility: (profile: DeviceProfileKey, section: DashboardSection, visible: boolean) => void
  setActiveDashboard: (dashboard: DashboardState['activeDashboard']) => void
  setPinnedComparisons: (ids: string[]) => void
}

const defaultVisibility: Record<DeviceProfileKey, SectionVisibilityConfig> = {
  desktop: {
    overview: true,
    consumption: true,
    aggregations: true,
    forecast: true,
    nowcast: true,
    invoices: true,
    alerts: true,
  },
  'mobile-portrait': {
    overview: true,
    consumption: true,
    aggregations: false,
    forecast: true,
    nowcast: true,
    invoices: false,
    alerts: true,
  },
  'mobile-landscape': {
    overview: true,
    consumption: true,
    aggregations: true,
    forecast: true,
    nowcast: true,
    invoices: true,
    alerts: true,
  },
}

function cloneVisibilityConfig() {
  return {
    desktop: { ...defaultVisibility.desktop },
    'mobile-portrait': { ...defaultVisibility['mobile-portrait'] },
    'mobile-landscape': { ...defaultVisibility['mobile-landscape'] },
  }
}

function resolveProfileKey(formFactor: DeviceFormFactor, orientation: DeviceOrientation): DeviceProfileKey {
  if (formFactor === 'desktop') return 'desktop'
  return orientation === 'portrait' ? 'mobile-portrait' : 'mobile-landscape'
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      timeRange: getDefaultTimeRange(),
      selectedPresetId: 'this_week',
      granularity: 'hour',
      componentFilters: [],
      householdZoneFilters: [],
      deviceFormFactor: 'desktop',
      deviceOrientation: 'landscape',
      sectionVisibility: cloneVisibilityConfig(),
      pinnedComparisons: [],
      activeDashboard: 'overview',

      setTimeRange: (range, presetId) =>
        set((state) => ({
          timeRange: range,
          selectedPresetId: presetId ?? null,
          granularity: presetId
            ? TIME_RANGE_PRESETS.find((preset) => preset.id === presetId)?.suggestedGranularity ??
              state.granularity
            : state.granularity,
        })),

      setGranularity: (granularity) => set({ granularity }),

      toggleComponentFilter: (component) =>
        set((state) => {
          const exists = state.componentFilters.includes(component)
          return {
            componentFilters: exists
              ? state.componentFilters.filter((item) => item !== component)
              : [...state.componentFilters, component],
          }
        }),

      toggleHouseholdZone: (zone) =>
        set((state) => {
          const exists = state.householdZoneFilters.includes(zone)
          return {
            householdZoneFilters: exists
              ? state.householdZoneFilters.filter((item) => item !== zone)
              : [...state.householdZoneFilters, zone],
          }
        }),

      clearFilters: () => set({ componentFilters: [], householdZoneFilters: [] }),

      setDeviceProfile: (formFactor, orientation) =>
        set({
          deviceFormFactor: formFactor,
          deviceOrientation: orientation,
        }),

      setSectionVisibility: (profile, section, visible) =>
          set((state) => {
            const fallback =
              defaultVisibility[profile] ?? defaultVisibility.desktop
            const existingProfileConfig = state.sectionVisibility[profile] ?? fallback
            return {
              sectionVisibility: {
                ...state.sectionVisibility,
                [profile]: {
                  ...existingProfileConfig,
                  [section]: visible,
                },
              },
            }
          }),

      setActiveDashboard: (dashboard) => set({ activeDashboard: dashboard }),

      setPinnedComparisons: (ids) => set({ pinnedComparisons: ids }),
    }),
    {
      name: 'dashboard-preferences',
      version: 1,
      partialize: (state) => ({
        selectedPresetId: state.selectedPresetId,
        componentFilters: state.componentFilters,
        householdZoneFilters: state.householdZoneFilters,
        deviceFormFactor: state.deviceFormFactor,
        deviceOrientation: state.deviceOrientation,
        sectionVisibility: state.sectionVisibility,
        pinnedComparisons: state.pinnedComparisons,
      }),
      migrate: (persistedState, version) => {
        if (!persistedState || version !== 1) return persistedState
        return persistedState
      },
    },
  ),
)

export function getCurrentProfileKey() {
  const state = useDashboardStore.getState()
  return resolveProfileKey(state.deviceFormFactor, state.deviceOrientation)
}

export function getSectionVisibility(profileKey?: DeviceProfileKey) {
  const state = useDashboardStore.getState()
  const key = profileKey ?? resolveProfileKey(state.deviceFormFactor, state.deviceOrientation)
  return state.sectionVisibility[key]
}
