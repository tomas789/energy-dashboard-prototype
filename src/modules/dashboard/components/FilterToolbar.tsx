import * as Popover from '@radix-ui/react-popover'
import { clsx } from 'clsx'
import { useMemo, useState } from 'react'
import { useDashboardData } from '../data/DashboardDataProvider'
import { useDashboardStore } from '../../../store/dashboardStore'
import type { EnergyComponentKey } from '../../../api/types'
import styles from './FilterToolbar.module.css'

const COMPONENT_LABELS: Record<EnergyComponentKey, { label: string; hint: string }> = {
  wholesale: { label: 'Wholesale', hint: 'Energy market' },
  regulated: { label: 'Regulated', hint: 'Distribution' },
  other: { label: 'Other', hint: 'Fees & services' },
}

export function FilterToolbar() {
  const componentFilters = useDashboardStore((state) => state.componentFilters)
  const toggleComponentFilter = useDashboardStore((state) => state.toggleComponentFilter)
  const householdZoneFilters = useDashboardStore((state) => state.householdZoneFilters)
  const toggleHouseholdZone = useDashboardStore((state) => state.toggleHouseholdZone)
  const clearFilters = useDashboardStore((state) => state.clearFilters)
  const { householdZones } = useDashboardData()
  const [open, setOpen] = useState(false)

  const activeZoneLabel = useMemo(() => {
    if (householdZoneFilters.length === 0) return 'All household zones'
    if (householdZoneFilters.length === 1) return `Zone: ${householdZoneFilters[0]}`
    return `${householdZoneFilters.length} zones selected`
  }, [householdZoneFilters])

  return (
    <div className={styles.root}>
      <div className={styles.group} role="group" aria-label="Components filter">
        {(Object.entries(COMPONENT_LABELS) as Array<
          [EnergyComponentKey, { label: string; hint: string }]
        >).map(([key, { label, hint }]) => (
          <button
            key={key}
            type="button"
            className={clsx(styles.chip, {
              [styles['chip--active']]: componentFilters.includes(key),
            })}
            onClick={() => toggleComponentFilter(key)}
          >
            <span>{label}</span>
            <span className={styles.hint}>{hint}</span>
          </button>
        ))}
      </div>

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className={styles.zoneTrigger}>
          <span>{activeZoneLabel}</span>
          <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden focusable="false">
            <path
              d="M5 7l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className={styles.popover} sideOffset={10} collisionPadding={12}>
            <div className={styles.popoverContent}>
              <p className={styles.popoverTitle}>Household zones</p>
              <div className={styles.zoneList}>
                {householdZones.map((zone) => {
                  const isActive = householdZoneFilters.includes(zone)
                  return (
                    <label key={zone} className={styles.zoneItem}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleHouseholdZone(zone)}
                      />
                      <span>{zone}</span>
                    </label>
                  )
                })}
              </div>
              <div className={styles.popoverFooter}>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => {
                    clearFilters()
                    setOpen(false)
                  }}
                >
                  Reset all
                </button>
                <button type="button" className={styles.doneButton} onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {(componentFilters.length > 0 || householdZoneFilters.length > 0) && (
        <button type="button" className={styles.resetInline} onClick={clearFilters}>
          Clear filters
        </button>
      )}
    </div>
  )
}
