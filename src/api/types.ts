export type EnergyComponentKey = 'wholesale' | 'regulated' | 'other'

export interface ComponentBreakdown {
  kwh: number
  costKc: number
}

export interface MeasurementComponents {
  wholesale: ComponentBreakdown
  regulated: ComponentBreakdown
  other?: ComponentBreakdown
}

export interface MinuteMeasurement {
  timestamp: string
  totalKwh: number
  totalCostKc: number
  components: MeasurementComponents
  householdZones: Record<string, number>
}

export type ConsumptionGranularity = 'minute' | 'hour' | 'day' | 'week' | 'month'

export interface AggregatedConsumption {
  timestamp: string
  granularity: ConsumptionGranularity
  totalKwh: number
  totalCostKc: number
  costPerKwh: number
  components: MeasurementComponents
  peakKwh: number
  baseLoadKwh: number
}

export interface ForecastPoint {
  timestamp: string
  expectedKwh: number
  expectedCostKc: number
  lowerKwh: number
  upperKwh: number
  components: MeasurementComponents
}

export interface NowcastPoint {
  timestamp: string
  estimatedKwh: number
  estimatedCostKc: number
  actualKwh?: number
  actualCostKc?: number
}

export interface InvoiceLineItem {
  label: string
  costKc: number
  kwh?: number
  component?: EnergyComponentKey
  fixed?: boolean
}

export interface Invoice {
  id: string
  periodStart: string
  periodEnd: string
  issuedAt: string
  dueAt: string
  totalCostKc: number
  billedKwh: number
  fixedChargesKc: number
  variableChargesKc: number
  components: MeasurementComponents
  status: 'paid' | 'open' | 'overdue'
  lineItems: InvoiceLineItem[]
  notes?: string
}

export interface TimeRange {
  from: string
  to: string
}

export interface ConsumptionFilters {
  components?: EnergyComponentKey[]
  householdZones?: string[]
}
