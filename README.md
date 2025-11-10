# Household Energy Dashboard Prototype

This project is a fully interactive prototype for monitoring household electricity consumption.  
It visualises minute-level telemetry, wholesale vs regulated components, costs in Kč, invoices, forecasts, and nowcasts using mock API data that mirrors the planned production endpoints.

Key capabilities include:

- Grafana-style time range picker with absolute/custom ranges and presets (`Last 1h`, `Today`, `This month`, `Last 90 days`, `Year to date`).
- Granularity controls (minute/hour/day/week/month) that update every chart and KPI.
- Stacked consumption chart with energy or monetary view, component and zone filters, and drill-down statistics (peak/base load, average cost per kWh).
- Aggregation view with switchable cards for hourly, daily, weekly, and monthly rollups.
- Forecast & nowcast workspace comparing model projections against actuals, with accuracy metrics and upper/lower bounds.
- Invoice explorer surfaces fixed vs variable charges, component splits, and line-item details.
- Alert centre flags forecast drift, stale nowcast data, peak load thresholds, and upcoming invoice due dates.
- Device configurator to toggle section visibility per device profile (desktop, iPhone portrait, iPhone landscape).

The entire UI runs on top of a deterministic mock API so it is production-like while remaining offline-capable.

---

## Quick start

```bash
npm install
npm run dev
```

Visit http://localhost:5173 to explore the dashboard.

Production build & bundle check:

```bash
npm run build
```

Unit tests for critical widgets:

```bash
npm run test
```

---

## Project structure

```
src/
  api/                // Mock API implementation and typing
  modules/dashboard/  // UI modules, data provider, sections, shared components
  store/              // Zustand global dashboard store
  utils/              // Formatting helpers
```

- `DashboardPage` stitches together the major sections.
- `DashboardDataProvider` centralises all data fetching, exposes refresh/load state, and ships with built-in mock responses.
- `useDashboardStore` manages time ranges, filters, device configuration, and pinned comparisons, persisting preferences to `localStorage`.

---

## Mock API & data schema

All front-end data requests route through the mock API in `src/api/mockApi.ts`, which simulates latency and returns realistic payloads derived from synthetic minute-level series.

Available endpoints and their shapes:

| Endpoint                         | Description                                                                                           |
|----------------------------------|-------------------------------------------------------------------------------------------------------|
| `/consumption?granularity=minute|hour|day|week|month` | Aggregated consumption objects `{ timestamp, totalKwh, totalCostKc, costPerKwh, components, peakKwh, baseLoadKwh }`. |
| `/consumption?granularity=minute`| Raw minute measurements `{ timestamp, totalKwh, totalCostKc, components, householdZones }`.           |
| `/forecasts`                     | Hourly forecast points `{ timestamp, expectedKwh, expectedCostKc, lowerKwh, upperKwh, components }`.   |
| `/nowcast`                       | Recent 5-minute estimates `{ timestamp, estimatedKwh, estimatedCostKc, actualKwh?, actualCostKc? }`.   |
| `/invoices`                      | Monthly invoices `{ id, periodStart, periodEnd, totals, components, lineItems, status, notes }`.       |
| `/household-zones`               | List of household zone ids used by the filter toolbar.                                                 |

All schemas are defined in `src/api/types.ts`. Switching to a real backend only requires updating the functions in `src/api/mockApi.ts`—the rest of the app uses those helpers exclusively.

### Customising the mocks

- Adjust generation parameters in `src/api/mockData.ts` (`MINUTE_SERIES_MONTHS`, component shares, seasonal profiles).
- Modify invoice or forecast logic directly in the same file.
- Each mock request simulates 160–280ms latency; tweak `NETWORK_LATENCY_MS` in `mockApi.ts` to mimic production performance.

---

## Responsive layout & device configuration

- Desktop renders the full experience; iPhone portrait defaults to a single-column layout with aggregations and invoices hidden to keep content concise; landscape restores additional sections.
- The “Layout & device” configurator (top-right) lets you:
  - Toggle between desktop and iPhone breakpoints and choose portrait/landscape.
  - Enable/disable sections per profile using switches (persisted via Zustand `persist` middleware).

Mobile layouts collapse tables (e.g. invoices) into stacked cards and adapt chart heights automatically.

---

## Filters & presets

- Component filters (wholesale, regulated, other) zero out hidden components across charts and stats.
- Household zone popover supports multi-select and resets.
- Dashboard presets (`Overview`, `Monthly`, `Custom comparison`) apply curated time ranges.

---

## Testing

Vitest drives the unit tests:

- `KpiCard` renders headline metrics.
- `InvoicesSection` expands and collapses invoice line items.

`npm run test` executes the suite. Add future tests to `src/modules/dashboard/**/__tests__`.

---

## Tech stack

- React 19 + TypeScript
- Vite 7 + Vitest
- Zustand for global state management
- Recharts for data visualisation
- Radix UI primitives for popovers and switches
- date-fns for time utilities

---

## Next steps

- Wire `src/api/mockApi.ts` to a real backend.
- Introduce authentication/household selection if needed.
- Add alert configuration UI and export/download actions.
- Optimise chart chunking or lazy-load sections if bundle size becomes a concern.
