import { formatISO } from 'date-fns'
import type {
  AggregatedConsumption,
  ConsumptionFilters,
  ConsumptionGranularity,
  ForecastPoint,
  Invoice,
  MinuteMeasurement,
  NowcastPoint,
  TimeRange,
} from './types'
import {
  getAggregatedConsumption,
  getAvailableHouseholdZones,
  getForecast,
  getInvoices,
  getMinuteMeasurements,
  getNowcast,
} from './mockData'

const NETWORK_LATENCY_MS = 160

async function simulateLatency() {
  const jitter = Math.random() * 120
  await new Promise((resolve) => setTimeout(resolve, NETWORK_LATENCY_MS + jitter))
}

export interface FetchConsumptionParams {
  range: TimeRange
  granularity: ConsumptionGranularity
  filters?: ConsumptionFilters
}

export async function fetchConsumption(
  params: FetchConsumptionParams,
): Promise<AggregatedConsumption[]> {
  await simulateLatency()
  return getAggregatedConsumption(params.range, params.granularity, params.filters)
}

export async function fetchMinuteSeries(
  range: TimeRange,
  filters?: ConsumptionFilters,
): Promise<MinuteMeasurement[]> {
  await simulateLatency()
  return getMinuteMeasurements(range, filters)
}

export async function fetchForecast(range: TimeRange): Promise<ForecastPoint[]> {
  await simulateLatency()
  return getForecast(range)
}

export async function fetchNowcast(range: TimeRange): Promise<NowcastPoint[]> {
  await simulateLatency()
  return getNowcast(range)
}

export async function fetchInvoices(): Promise<Invoice[]> {
  await simulateLatency()
  return getInvoices()
}

export async function fetchHouseholdZones(): Promise<string[]> {
  await simulateLatency()
  return getAvailableHouseholdZones()
}

export function getDefaultTimeRange(): TimeRange {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - 7)
  return {
    from: formatISO(from),
    to: formatISO(now),
  }
}
