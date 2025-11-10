import * as Popover from '@radix-ui/react-popover'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import { useMemo, useState } from 'react'
import { useDashboardStore, TIME_RANGE_PRESETS } from '../../../store/dashboardStore'
import type { TimeRange } from '../../../api/types'
import styles from './TimeRangePicker.module.css'

const DATE_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm"

function toDateInputValue(isoDate: string) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return format(new Date(), DATE_INPUT_FORMAT)
  }
  return format(date, DATE_INPUT_FORMAT)
}

function fromInputValue(value: string) {
  const date = new Date(value)
  return date.toISOString()
}

export function TimeRangePicker() {
  const timeRange = useDashboardStore((state) => state.timeRange)
  const setTimeRange = useDashboardStore((state) => state.setTimeRange)
  const selectedPresetId = useDashboardStore((state) => state.selectedPresetId)

  const [open, setOpen] = useState(false)
  const [customRange, setCustomRange] = useState<TimeRange>(timeRange)

  const activeLabel = useMemo(() => {
    if (selectedPresetId) {
      const preset = TIME_RANGE_PRESETS.find((item) => item.id === selectedPresetId)
      if (preset) return preset.label
    }
    const from = new Date(timeRange.from)
    const to = new Date(timeRange.to)
    return `${format(from, 'd MMM HH:mm')} – ${format(to, 'd MMM HH:mm')}`
  }, [selectedPresetId, timeRange])

  const handlePresetSelect = (presetId: string) => {
    const preset = TIME_RANGE_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    const range = preset.getRange()
    setCustomRange(range)
    setTimeRange(range, presetId)
    setOpen(false)
  }

  const handleApplyCustom = () => {
    if (new Date(customRange.to) < new Date(customRange.from)) return
    setTimeRange(customRange, null)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={styles.trigger} aria-label="Select time range">
        <span>{activeLabel}</span>
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
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Quick ranges</p>
              <div className={styles.presetGrid}>
                {TIME_RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    className={clsx(styles.presetButton, {
                      [styles['presetButton--active']]: preset.id === selectedPresetId,
                    })}
                    onClick={() => handlePresetSelect(preset.id)}
                    type="button"
                  >
                    <span className={styles.presetLabel}>{preset.label}</span>
                    <span className={styles.presetDescription}>{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Custom range</p>
              <div className={styles.customGrid}>
                <label className={styles.field}>
                  <span>From</span>
                  <input
                    type="datetime-local"
                    value={toDateInputValue(customRange.from)}
                    max={toDateInputValue(customRange.to)}
                    onChange={(event) =>
                      setCustomRange((prev) => ({
                        ...prev,
                        from: fromInputValue(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>To</span>
                  <input
                    type="datetime-local"
                    value={toDateInputValue(customRange.to)}
                    min={toDateInputValue(customRange.from)}
                    onChange={(event) =>
                      setCustomRange((prev) => ({
                        ...prev,
                        to: fromInputValue(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
            </div>
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setCustomRange(timeRange)
                  setOpen(false)
                }}
              >
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleApplyCustom}>
                Apply
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
