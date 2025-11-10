import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  differenceInMinutes,
  endOfMonth,
  formatISO,
  getDate,
  getDay,
  getHours,
  getMinutes,
  getMonth,
  isWithinInterval,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type {
  AggregatedConsumption,
  ConsumptionFilters,
  ConsumptionGranularity,
  ForecastPoint,
  Invoice,
  MeasurementComponents,
  MinuteMeasurement,
  NowcastPoint,
  TimeRange,
} from './types'

const WHOLESALE_RATE_KC = 3.45
const REGULATED_RATE_KC = 2.85
const OTHER_RATE_KC = 1.1

const HOUSEHOLD_ZONES = ['living-room', 'kitchen', 'garage', 'heat-pump', 'solar-buffer'] as const

type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}

interface AggregationBucket {
  totalKwh: number
  totalCostKc: number
  components: MeasurementComponents
  count: number
  peakKwh: number
  baseLoadKwh: number
}

const MINUTE_SERIES_MONTHS = 13

function createRng(seed: number) {
  let t = seed + 0x6d2b79f5
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const rng = createRng(20250601)

function gaussianRandom(mean = 0, stdev = 1) {
  // Box-Muller transform
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  const mag = Math.sqrt(-2.0 * Math.log(u))
  const z0 = mag * Math.cos(2.0 * Math.PI * v)
  return z0 * stdev + mean
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function generateMinuteSeries(): MinuteMeasurement[] {
  const now = startOfMinute(new Date())
  const start = addMonths(now, -MINUTE_SERIES_MONTHS)
  const minutes = differenceInMinutes(now, start)
  const data: MinuteMeasurement[] = new Array(minutes + 1)

  let current = start
  for (let i = 0; i <= minutes; i += 1) {
    const hourOfDay = getHours(current) + getMinutes(current) / 60
    const dayOfWeek = getDay(current)
    const month = getMonth(current)

    const dayCycle = 0.4 + 0.55 * Math.sin((2 * Math.PI * hourOfDay) / 24 - Math.PI / 2)
    const eveningPeak = 0.35 * Math.exp(-Math.pow((hourOfDay - 19) / 2, 2))
    const morningPeak = 0.22 * Math.exp(-Math.pow((hourOfDay - 7.5) / 1.8, 2))
    const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 0.25 : 0
    const seasonalSwing = 0.18 * Math.sin((2 * Math.PI * (month + hourOfDay / 24)) / 12)
    const solarOffset = Math.max(0, 0.28 * Math.sin((2 * Math.PI * (hourOfDay - 6)) / 24))

    const kwhPerHour =
      1.4 + dayCycle + eveningPeak + morningPeak + weekendBoost + seasonalSwing - solarOffset

    const totalKwh = clamp(kwhPerHour / 60 + gaussianRandom(0, 0.005), 0.004, 0.12)

    const wholesaleShare = clamp(0.58 + gaussianRandom(0, 0.05), 0.45, 0.7)
    const regulatedShare = clamp(0.37 + gaussianRandom(0, 0.05), 0.25, 0.5)
    const otherShare = clamp(1 - wholesaleShare - regulatedShare, 0.02, 0.12)
    const normalization = wholesaleShare + regulatedShare + otherShare

    const wholesaleKwh = (wholesaleShare / normalization) * totalKwh
    const regulatedKwh = (regulatedShare / normalization) * totalKwh
    const otherKwh = Math.max(0, totalKwh - wholesaleKwh - regulatedKwh)

    const wholesaleCost = wholesaleKwh * WHOLESALE_RATE_KC
    const regulatedCost = regulatedKwh * REGULATED_RATE_KC
    const otherCost = otherKwh * OTHER_RATE_KC

    const zones = HOUSEHOLD_ZONES.reduce<Record<string, number>>((acc, zone) => {
      const base =
        zone === 'heat-pump'
          ? 0.32
          : zone === 'kitchen'
            ? 0.24
            : zone === 'living-room'
              ? 0.18
              : zone === 'garage'
                ? 0.16
                : 0.1
      acc[zone] = clamp(base * totalKwh * (0.85 + gaussianRandom(0, 0.18)), 0, totalKwh)
      return acc
    }, {})

    const zoneSum = Object.values(zones).reduce((sum, value) => sum + value, 0)
    if (zoneSum > 0) {
      const scale = totalKwh / zoneSum
      for (const zone of HOUSEHOLD_ZONES) {
        zones[zone] *= scale
      }
    }

    data[i] = {
      timestamp: formatISO(current),
      totalKwh,
      totalCostKc: wholesaleCost + regulatedCost + otherCost,
      components: {
        wholesale: { kwh: wholesaleKwh, costKc: wholesaleCost },
        regulated: { kwh: regulatedKwh, costKc: regulatedCost },
        other: { kwh: otherKwh, costKc: otherCost },
      },
      householdZones: zones,
    }

    current = addMinutes(current, 1)
  }

  return data
}

const MINUTE_SERIES = generateMinuteSeries()

function deriveBucketStart(dateIso: string, granularity: ConsumptionGranularity) {
  const date = new Date(dateIso)
  switch (granularity) {
    case 'minute':
      return startOfMinute(date)
    case 'hour':
      return startOfHour(date)
    case 'day':
      return startOfDay(date)
    case 'week':
      return startOfWeek(date, { weekStartsOn: 1 })
    case 'month':
      return startOfMonth(date)
    default:
      return date
  }
}

function emptyComponents(): MeasurementComponents {
  return {
    wholesale: { kwh: 0, costKc: 0 },
    regulated: { kwh: 0, costKc: 0 },
    other: { kwh: 0, costKc: 0 },
  }
}

function aggregateMeasurements(
  measurements: MinuteMeasurement[],
  granularity: ConsumptionGranularity,
): AggregatedConsumption[] {
  if (granularity === 'minute') {
    return measurements.map((measurement) => ({
      timestamp: measurement.timestamp,
      granularity,
      totalKwh: measurement.totalKwh,
      totalCostKc: measurement.totalCostKc,
      costPerKwh: measurement.totalKwh === 0 ? 0 : measurement.totalCostKc / measurement.totalKwh,
      components: measurement.components,
      peakKwh: measurement.totalKwh,
      baseLoadKwh: measurement.totalKwh,
    }))
  }

  const buckets = new Map<string, Mutable<AggregationBucket>>()

  for (const measurement of measurements) {
    const start = deriveBucketStart(measurement.timestamp, granularity)
    const bucketKey = formatISO(start)
    const bucket =
      buckets.get(bucketKey) ??
      buckets
        .set(bucketKey, {
          totalKwh: 0,
          totalCostKc: 0,
          components: emptyComponents(),
          count: 0,
          peakKwh: 0,
          baseLoadKwh: Number.POSITIVE_INFINITY,
        })
        .get(bucketKey)!

    bucket.totalKwh += measurement.totalKwh
    bucket.totalCostKc += measurement.totalCostKc
    bucket.count += 1
    bucket.peakKwh = Math.max(bucket.peakKwh, measurement.totalKwh)
    bucket.baseLoadKwh = Math.min(bucket.baseLoadKwh, measurement.totalKwh)

    bucket.components.wholesale.kwh += measurement.components.wholesale.kwh
    bucket.components.wholesale.costKc += measurement.components.wholesale.costKc
    bucket.components.regulated.kwh += measurement.components.regulated.kwh
    bucket.components.regulated.costKc += measurement.components.regulated.costKc
    if (bucket.components.other && measurement.components.other) {
      bucket.components.other.kwh += measurement.components.other.kwh
      bucket.components.other.costKc += measurement.components.other.costKc
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([timestamp, bucket]) => ({
      timestamp,
      granularity,
      totalKwh: bucket.totalKwh,
      totalCostKc: bucket.totalCostKc,
      costPerKwh: bucket.totalKwh === 0 ? 0 : bucket.totalCostKc / bucket.totalKwh,
      components: bucket.components,
      peakKwh: bucket.peakKwh,
      baseLoadKwh: bucket.baseLoadKwh === Number.POSITIVE_INFINITY ? 0 : bucket.baseLoadKwh,
    }))
}

function filterMeasurements(range: TimeRange) {
  return MINUTE_SERIES.filter((measurement) =>
    isWithinInterval(new Date(measurement.timestamp), {
      start: new Date(range.from),
      end: new Date(range.to),
    }),
  )
}

function applyFilters(
  measurements: MinuteMeasurement[],
  filters: ConsumptionFilters | undefined,
): MinuteMeasurement[] {
  if (!filters) return measurements
  const { components, householdZones } = filters
  if (!components && !householdZones) return measurements

  return measurements.map((measurement) => {
    const clone: MinuteMeasurement = {
      ...measurement,
      components: {
        wholesale: { ...measurement.components.wholesale },
        regulated: { ...measurement.components.regulated },
        other: measurement.components.other ? { ...measurement.components.other } : undefined,
      },
      householdZones: { ...measurement.householdZones },
    }

    if (components && components.length > 0) {
      const active = new Set(components)
      let totalKwh = 0
      let totalCostKc = 0

      const updateComponent = (key: 'wholesale' | 'regulated' | 'other' | undefined) => {
        if (!key) return
        const component = clone.components[key]
        if (!component) return
        if (active.has(key)) {
          totalKwh += component.kwh
          totalCostKc += component.costKc
        } else {
          component.kwh = 0
          component.costKc = 0
        }
      }

      updateComponent('wholesale')
      updateComponent('regulated')
      updateComponent(clone.components.other ? 'other' : undefined)

      clone.totalKwh = totalKwh
      clone.totalCostKc = totalCostKc
    }

    if (householdZones && householdZones.length > 0) {
      const zoneSet = new Set(householdZones)
      const filteredZones = Object.entries(clone.householdZones).reduce<Record<string, number>>(
        (acc, [zone, value]) => {
          if (zoneSet.has(zone)) {
            acc[zone] = value
          }
          return acc
        },
        {},
      )

      clone.householdZones = filteredZones
      const zoneSum = Object.values(filteredZones).reduce((sum, value) => sum + value, 0)
      if (zoneSum > 0 && (!components || components.length === 0)) {
        clone.totalKwh = zoneSum
        clone.totalCostKc =
          clone.components.wholesale.costKc +
          clone.components.regulated.costKc +
          (clone.components.other?.costKc ?? 0)
      }
    }

    return clone
  })
}

function buildForecast(range: TimeRange): ForecastPoint[] {
  const horizonHours = Math.min(
    24 * 14,
    Math.max(24, differenceInMinutes(new Date(range.to), new Date(range.from)) / 60),
  )
  const start = startOfHour(new Date(range.to))
  const points: ForecastPoint[] = []

  for (let i = 1; i <= horizonHours; i += 1) {
    const timestamp = addHours(start, i)
    const referenceMinute =
      MINUTE_SERIES[Math.max(0, MINUTE_SERIES.length - 1 - (24 * 60 - i * 30))]
    const base = referenceMinute?.totalKwh ?? 0.018
    const seasonality = 0.004 * Math.sin((2 * Math.PI * i) / 24)
    const expectedKwh = clamp(base + seasonality + gaussianRandom(0, 0.002), 0.01, 0.16)

    const wholesaleKwh = expectedKwh * 0.62
    const regulatedKwh = expectedKwh * 0.3
    const otherKwh = Math.max(0, expectedKwh - wholesaleKwh - regulatedKwh)

    const components: MeasurementComponents = {
      wholesale: { kwh: wholesaleKwh, costKc: wholesaleKwh * WHOLESALE_RATE_KC },
      regulated: { kwh: regulatedKwh, costKc: regulatedKwh * REGULATED_RATE_KC },
      other: { kwh: otherKwh, costKc: otherKwh * OTHER_RATE_KC },
    }

    points.push({
      timestamp: formatISO(timestamp),
      expectedKwh,
      expectedCostKc:
        components.wholesale.costKc +
        components.regulated.costKc +
        (components.other?.costKc ?? 0),
      lowerKwh: clamp(expectedKwh * 0.88, 0, expectedKwh),
      upperKwh: expectedKwh * 1.15,
      components,
    })
  }

  return points
}

function buildNowcast(range: TimeRange): NowcastPoint[] {
  const now = startOfMinute(new Date(range.to))
  const lookbackMinutes = Math.min(6 * 60, differenceInMinutes(now, new Date(range.from)))
  const points: NowcastPoint[] = []

  for (let i = lookbackMinutes; i >= 0; i -= 5) {
    const timestamp = addMinutes(now, -i)
    const measurement = MINUTE_SERIES.find(
      (item) => item.timestamp === formatISO(startOfMinute(timestamp)),
    )
    if (!measurement) continue

    points.push({
      timestamp: measurement.timestamp,
      estimatedKwh: measurement.totalKwh * (1 + gaussianRandom(0, 0.015)),
      estimatedCostKc: measurement.totalCostKc * (1 + gaussianRandom(0, 0.02)),
      actualKwh: measurement.totalKwh,
      actualCostKc: measurement.totalCostKc,
    })
  }

  return points
}

function buildInvoices(): Invoice[] {
  const invoices: Invoice[] = []
  const now = new Date()
  for (let i = 0; i < 13; i += 1) {
    const periodEnd = endOfMonth(addMonths(now, -i))
    const periodStart = startOfMonth(addMonths(now, -i))
    const monthMeasurements = filterMeasurements({
      from: formatISO(periodStart),
      to: formatISO(periodEnd),
    })

    const totals = monthMeasurements.reduce(
      (acc, measurement) => {
        acc.kwh += measurement.totalKwh
        acc.cost += measurement.totalCostKc
        acc.wholesaleKwh += measurement.components.wholesale.kwh
        acc.wholesaleCost += measurement.components.wholesale.costKc
        acc.regulatedKwh += measurement.components.regulated.kwh
        acc.regulatedCost += measurement.components.regulated.costKc
        if (measurement.components.other) {
          acc.otherKwh += measurement.components.other.kwh
          acc.otherCost += measurement.components.other.costKc
        }
        return acc
      },
      {
        kwh: 0,
        cost: 0,
        wholesaleKwh: 0,
        wholesaleCost: 0,
        regulatedKwh: 0,
        regulatedCost: 0,
        otherKwh: 0,
        otherCost: 0,
      },
    )

    const fixedChargesKc = 450 + Math.max(0, gaussianRandom(0, 40))
    const variableChargesKc = Math.max(0, totals.cost - fixedChargesKc)
    const issueDate = addDays(periodEnd, 2)
    const dueDate = addDays(issueDate, 20)

    invoices.push({
      id: `INV-${formatISO(periodStart).slice(0, 7)}`,
      periodStart: formatISO(periodStart),
      periodEnd: formatISO(periodEnd),
      issuedAt: formatISO(issueDate),
      dueAt: formatISO(dueDate),
      totalCostKc: fixedChargesKc + variableChargesKc,
      billedKwh: totals.kwh,
      fixedChargesKc,
      variableChargesKc,
      components: {
        wholesale: { kwh: totals.wholesaleKwh, costKc: totals.wholesaleCost },
        regulated: { kwh: totals.regulatedKwh, costKc: totals.regulatedCost },
        other: { kwh: totals.otherKwh, costKc: totals.otherCost },
      },
      status: i === 0 ? 'open' : i === 1 && getDate(now) > 20 ? 'overdue' : 'paid',
      lineItems: [
        {
          label: 'Fixed distribution fee',
          costKc: fixedChargesKc * 0.7,
          fixed: true,
        },
        {
          label: 'Metering service',
          costKc: fixedChargesKc * 0.3,
          fixed: true,
        },
        {
          label: 'Wholesale energy',
          costKc: totals.wholesaleCost,
          kwh: totals.wholesaleKwh,
          component: 'wholesale',
        },
        {
          label: 'Regulated energy',
          costKc: totals.regulatedCost,
          kwh: totals.regulatedKwh,
          component: 'regulated',
        },
        totals.otherCost > 0
          ? {
              label: 'Other charges',
              costKc: totals.otherCost,
              kwh: totals.otherKwh,
              component: 'other',
            }
          : undefined,
      ].filter(Boolean) as Invoice['lineItems'],
      notes:
        i === 0
          ? 'Pending settlement of rooftop solar credit from DSOp.'
          : i === 1
            ? 'Please review consumption spike around heat pump maintenance.'
            : undefined,
    })
  }
  return invoices
}

const INVOICES = buildInvoices()

export function getMinuteMeasurements(range: TimeRange, filters?: ConsumptionFilters) {
  return applyFilters(filterMeasurements(range), filters)
}

export function getAggregatedConsumption(
  range: TimeRange,
  granularity: ConsumptionGranularity,
  filters?: ConsumptionFilters,
) {
  const measurements = getMinuteMeasurements(range, filters)
  return aggregateMeasurements(measurements, granularity)
}

export function getForecast(range: TimeRange) {
  return buildForecast(range)
}

export function getNowcast(range: TimeRange) {
  return buildNowcast(range)
}

export function getInvoices() {
  return INVOICES
}

export function getAvailableHouseholdZones() {
  return [...HOUSEHOLD_ZONES]
}
