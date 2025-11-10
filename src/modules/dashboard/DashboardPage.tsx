import { useMemo } from 'react'
import { TimeRangePicker } from './components/TimeRangePicker'
import { GranularitySelector } from './components/GranularitySelector'
import { FilterToolbar } from './components/FilterToolbar'
import { DeviceConfigurator } from './components/DeviceConfigurator'
import { OverviewSection } from './sections/OverviewSection'
import { ConsumptionSection } from './sections/ConsumptionSection'
import { AggregationsSection } from './sections/AggregationsSection'
import { ForecastSection } from './sections/ForecastSection'
import { InvoicesSection } from './sections/InvoicesSection'
import { AlertsSection } from './sections/AlertsSection'
import { useDashboardData } from './data/DashboardDataProvider'
import {
  useDashboardStore,
  TIME_RANGE_PRESETS,
  type DeviceProfileKey,
} from '../../store/dashboardStore'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { loading, error, refresh, lastUpdated } = useDashboardData()
  const deviceFormFactor = useDashboardStore((state) => state.deviceFormFactor)
  const deviceOrientation = useDashboardStore((state) => state.deviceOrientation)
  const sectionVisibility = useDashboardStore((state) => state.sectionVisibility)
  const activeDashboard = useDashboardStore((state) => state.activeDashboard)
  const setActiveDashboard = useDashboardStore((state) => state.setActiveDashboard)
  const setTimeRange = useDashboardStore((state) => state.setTimeRange)

  const profileKey = useMemo<DeviceProfileKey>(() => {
    if (deviceFormFactor === 'desktop') return 'desktop'
    return deviceOrientation === 'portrait' ? 'mobile-portrait' : 'mobile-landscape'
  }, [deviceFormFactor, deviceOrientation])

  const visibility = sectionVisibility[profileKey]

  const handleDashboardSelect = (target: typeof activeDashboard) => {
    setActiveDashboard(target)
    if (target === 'overview') {
      const preset = TIME_RANGE_PRESETS.find((item) => item.id === 'this_week')
      if (preset) setTimeRange(preset.getRange(), preset.id)
    } else if (target === 'monthly') {
      const preset = TIME_RANGE_PRESETS.find((item) => item.id === 'this_month')
      if (preset) setTimeRange(preset.getRange(), preset.id)
    } else if (target === 'custom') {
      const preset = TIME_RANGE_PRESETS.find((item) => item.id === 'last_90d')
      if (preset) setTimeRange(preset.getRange(), preset.id)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <TimeRangePicker />
          <GranularitySelector />
        </div>
        <div className={styles.topBarRight}>
          <DeviceConfigurator />
          <button type="button" className={styles.refreshButton} onClick={refresh}>
            Refresh data
          </button>
          <span className={styles.timestamp}>
            {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Loading…'}
          </span>
        </div>
      </div>

      <div className={styles.filterRow}>
        <FilterToolbar />
        <div className={styles.dashboardSwitch} role="group" aria-label="Dashboard mode">
          <button
            type="button"
            className={activeDashboard === 'overview' ? styles.switchActive : ''}
            onClick={() => handleDashboardSelect('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={activeDashboard === 'monthly' ? styles.switchActive : ''}
            onClick={() => handleDashboardSelect('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={activeDashboard === 'custom' ? styles.switchActive : ''}
            onClick={() => handleDashboardSelect('custom')}
          >
            Custom comparison
          </button>
        </div>
      </div>

      {loading && (
        <div className={styles.loader} role="status">
          <div className={styles.spinner} />
          <span>Loading dashboard data…</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.sections}>
          {visibility.overview && <OverviewSection />}
          {visibility.consumption && <ConsumptionSection />}
          {visibility.aggregations && <AggregationsSection />}
          {visibility.forecast && <ForecastSection />}
          {visibility.invoices && <InvoicesSection />}
          {visibility.alerts && <AlertsSection />}
        </div>
      )}
    </div>
  )
}
