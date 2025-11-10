const currencyFormatter = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
})

const kwhFormatter = new Intl.NumberFormat('cs-CZ', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

const costPerKwhFormatter = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentageFormatter = new Intl.NumberFormat('cs-CZ', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const integerFormatter = new Intl.NumberFormat('cs-CZ')

export function formatCurrency(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '–'
  return currencyFormatter.format(value)
}

export function formatKwh(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '–'
  return `${kwhFormatter.format(value)} kWh`
}

export function formatCostPerKwh(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '–'
  return `${costPerKwhFormatter.format(value)} / kWh`
}

export function formatPercentage(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '–'
  return percentageFormatter.format(value)
}

export function compactNumber(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '–'
  return integerFormatter.format(Math.round(value))
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return '–'
  }
  return new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return '–'
  }
  return new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatMonth(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '–'
  return new Intl.DateTimeFormat('cs-CZ', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function deltaLabel(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return '–'
  const delta = (current - previous) / previous
  const formatted = formatPercentage(delta)
  return delta >= 0 ? `▲ ${formatted}` : `▼ ${formatted}`
}
