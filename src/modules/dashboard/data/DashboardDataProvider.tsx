import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { formatISO } from 'date-fns'
import {
  fetchConsumption,
  fetchForecast,
  fetchHouseholdZones,
  fetchInvoices,
  fetchMinuteSeries,
  fetchNowcast,
} from '../../../api/mockApi'
import type {
  AggregatedConsumption,
  ConsumptionGranularity,
  ForecastPoint,
  Invoice,
  MinuteMeasurement,
  NowcastPoint,
  TimeRange,
} from '../../../api/types'
import { useDashboardStore } from '../../../store/dashboardStore'

type AggregationMap = Record<ConsumptionGranularity, AggregatedConsumption[]>

interface DashboardDataState {
  timeRange: TimeRange
  primaryConsumption: AggregatedConsumption[]
  aggregations: AggregationMap
  minuteSeries: MinuteMeasurement[]
  forecast: ForecastPoint[]
  nowcast: NowcastPoint[]
  invoices: Invoice[]
  householdZones: string[]
  lastUpdated?: string
}

interface DashboardDataContextValue extends DashboardDataState {
  loading: boolean
  error?: string
  refresh: () => Promise<void>
}

const DashboardDataContext = createContext<DashboardDataContextValue | undefined>(undefined)

const initialState: DashboardDataState = {
  timeRange: { from: '', to: '' },
  primaryConsumption: [],
  aggregations: {
    minute: [],
    hour: [],
    day: [],
    week: [],
    month: [],
  },
  minuteSeries: [],
  forecast: [],
  nowcast: [],
  invoices: [],
  householdZones: [],
  lastUpdated: undefined,
}

const SECONDARY_GRANULARITIES: ConsumptionGranularity[] = ['hour', 'day', 'week', 'month']

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardDataState>(initialState)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [householdZones, setHouseholdZones] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [lastUpdated, setLastUpdated] = useState<string>()

  const timeRange = useDashboardStore((store) => store.timeRange)
  const granularity = useDashboardStore((store) => store.granularity)
  const componentFilters = useDashboardStore((store) => store.componentFilters)
  const householdZoneFilters = useDashboardStore((store) => store.householdZoneFilters)

  const activeFiltersRef = useRef({
    componentFilters,
    householdZoneFilters,
  })

  useEffect(() => {
    const current = activeFiltersRef.current
    if (
      current.componentFilters !== componentFilters ||
      current.householdZoneFilters !== householdZoneFilters
    ) {
      activeFiltersRef.current = {
        componentFilters,
        householdZoneFilters,
      }
    }
  }, [componentFilters, householdZoneFilters])

  const filters = useMemo(
    () => ({
      components: componentFilters.length > 0 ? componentFilters : undefined,
      householdZones: householdZoneFilters.length > 0 ? householdZoneFilters : undefined,
    }),
    [componentFilters, householdZoneFilters],
  )

  const loadStaticReferences = useCallback(async () => {
    let resolvedInvoices = invoices
    let resolvedZones = householdZones

    if (resolvedInvoices.length === 0) {
      resolvedInvoices = await fetchInvoices()
      setInvoices(resolvedInvoices)
    }

    if (resolvedZones.length === 0) {
      resolvedZones = await fetchHouseholdZones()
      setHouseholdZones(resolvedZones)
    }

    return { invoices: resolvedInvoices, zones: resolvedZones }
  }, [householdZones, invoices])

  const loadData = useCallback(
    async (range: TimeRange, primaryGranularity: ConsumptionGranularity) => {
      setLoading(true)
      setError(undefined)
      try {
        const staticData = await loadStaticReferences()
        const secondaryGrans = SECONDARY_GRANULARITIES.filter(
          (gran) => gran !== primaryGranularity,
        )

        const [primary, minutes, forecastPoints, nowcastPoints, ...secondaryResults] =
          await Promise.all([
          fetchConsumption({ range, granularity: primaryGranularity, filters }),
          fetchMinuteSeries(range, filters),
          fetchForecast(range),
          fetchNowcast(range),
            ...secondaryGrans.map((gran) => fetchConsumption({ range, granularity: gran, filters })),
          ])

        const aggregationMap: AggregationMap = {
          minute:
            primaryGranularity === 'minute'
              ? primary
              : await fetchConsumption({ range, granularity: 'minute', filters }),
          hour: [],
          day: [],
          week: [],
          month: [],
        }

        let index = 0
        for (const gran of secondaryGrans) {
          aggregationMap[gran] = secondaryResults[index] ?? []
          index += 1
        }

        if (primaryGranularity !== 'minute') {
          aggregationMap[primaryGranularity] = primary
        }

        const updatedAt = formatISO(new Date())
        setState({
          timeRange: range,
          primaryConsumption: primary,
          aggregations: aggregationMap,
          minuteSeries: minutes,
          forecast: forecastPoints,
          nowcast: nowcastPoints,
          invoices: staticData.invoices,
          householdZones: staticData.zones,
          lastUpdated: updatedAt,
        })
        setLastUpdated(updatedAt)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    },
    [filters, loadStaticReferences],
  )

  useEffect(() => {
    loadData(timeRange, granularity)
  }, [granularity, loadData, timeRange])

  const contextValue = useMemo<DashboardDataContextValue>(
      () => ({
        ...state,
        invoices: invoices.length > 0 ? invoices : state.invoices,
        householdZones: householdZones.length > 0 ? householdZones : state.householdZones,
        loading,
        error,
        lastUpdated,
        refresh: async () => {
          await loadData(timeRange, granularity)
        },
      }),
    [
      error,
      granularity,
      householdZones,
      lastUpdated,
      loadData,
      loading,
      invoices,
      state,
      timeRange,
    ],
  )

  return (
    <DashboardDataContext.Provider value={contextValue}>
      {children}
    </DashboardDataContext.Provider>
  )
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext)
  if (!context) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider')
  }
  return context
}
