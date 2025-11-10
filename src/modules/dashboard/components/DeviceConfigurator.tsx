import * as Popover from '@radix-ui/react-popover'
import * as Switch from '@radix-ui/react-switch'
import { clsx } from 'clsx'
import { useMemo, useState } from 'react'
import {
  useDashboardStore,
  type DashboardSection,
  type DeviceFormFactor,
  type DeviceOrientation,
  type DeviceProfileKey,
} from '../../../store/dashboardStore'
import styles from './DeviceConfigurator.module.css'

const SECTION_LABELS: Record<DashboardSection, string> = {
  overview: 'Overview KPIs',
  consumption: 'Consumption detail',
  aggregations: 'Aggregations',
  forecast: 'Forecast',
  nowcast: 'Nowcast',
  invoices: 'Invoices',
  alerts: 'Alerts',
}

export function DeviceConfigurator() {
  const setDeviceProfile = useDashboardStore((state) => state.setDeviceProfile)
  const sectionVisibility = useDashboardStore((state) => state.sectionVisibility)
  const setSectionVisibility = useDashboardStore((state) => state.setSectionVisibility)
  const deviceFormFactor = useDashboardStore((state) => state.deviceFormFactor)
  const deviceOrientation = useDashboardStore((state) => state.deviceOrientation)

  const [open, setOpen] = useState(false)

  const profileKey = useMemo<DeviceProfileKey>(() => {
    if (deviceFormFactor === 'desktop') return 'desktop'
    return deviceOrientation === 'portrait' ? 'mobile-portrait' : 'mobile-landscape'
  }, [deviceFormFactor, deviceOrientation])
  const visibility = sectionVisibility[profileKey] ?? sectionVisibility.desktop

  const handleFormFactorChange = (formFactor: DeviceFormFactor) => {
    const nextOrientation = formFactor === 'desktop' ? 'landscape' : deviceOrientation
    setDeviceProfile(formFactor, nextOrientation)
  }

  const handleOrientationChange = (orientation: DeviceOrientation) => {
    setDeviceProfile(deviceFormFactor === 'desktop' ? 'desktop' : 'mobile', orientation)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={styles.trigger}>
        <span>Layout & device</span>
        <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden focusable="false">
          <path
            d="M5 7l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.popover} sideOffset={12} collisionPadding={16}>
          <div className={styles.panel}>
            <div>
              <p className={styles.title}>Form factor</p>
              <div className={styles.segmented}>
                <button
                  type="button"
                  className={clsx(styles.segment, {
                    [styles['segment--active']]: deviceFormFactor === 'desktop',
                  })}
                  onClick={() => handleFormFactorChange('desktop')}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  className={clsx(styles.segment, {
                    [styles['segment--active']]: deviceFormFactor === 'mobile',
                  })}
                  onClick={() => handleFormFactorChange('mobile')}
                >
                  iPhone
                </button>
              </div>
            </div>

            <div>
              <p className={styles.title}>Orientation</p>
              <div className={styles.segmented}>
                <button
                  type="button"
                  className={clsx(styles.segment, {
                    [styles['segment--active']]: deviceOrientation === 'portrait',
                    [styles['segment--disabled']]: deviceFormFactor === 'desktop',
                  })}
                  disabled={deviceFormFactor === 'desktop'}
                  onClick={() => handleOrientationChange('portrait')}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  className={clsx(styles.segment, {
                    [styles['segment--active']]: deviceOrientation === 'landscape',
                  })}
                  onClick={() => handleOrientationChange('landscape')}
                >
                  Landscape
                </button>
              </div>
            </div>

            <div>
              <p className={styles.title}>Visible sections</p>
              <div className={styles.sectionList}>
                {(Object.entries(SECTION_LABELS) as Array<[DashboardSection, string]>).map(
                  ([section, label]) => {
                    const isChecked = visibility?.[section] ?? true
                    return (
                      <label key={section} className={styles.sectionRow}>
                        <div>
                          <span>{label}</span>
                          <span className={styles.sectionHint}>{sectionDescriptions[section]}</span>
                        </div>
                        <Switch.Root
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            setSectionVisibility(profileKey, section, checked)
                          }
                          className={styles.switchRoot}
                        >
                          <Switch.Thumb className={styles.switchThumb} />
                        </Switch.Root>
                      </label>
                    )
                  },
                )}
              </div>
            </div>

            <button type="button" className={styles.closeButton} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

const sectionDescriptions: Record<DashboardSection, string> = {
  overview: 'Headline KPIs & trends',
  consumption: 'Minute/hour charts & stats',
  aggregations: 'Aggregated cards & tables',
  forecast: 'Forecast vs actual comparison',
  nowcast: 'Live nowcast accuracy',
  invoices: 'Monthly invoices & charges',
  alerts: 'Threshold alerts & insights',
}
