import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { InvoicesSection } from '../InvoicesSection'

const mockInvoices = [
  {
    id: 'INV-2025-01',
    periodStart: '2025-01-01T00:00:00.000Z',
    periodEnd: '2025-01-31T23:59:59.000Z',
    issuedAt: '2025-02-02T08:00:00.000Z',
    dueAt: '2025-02-20T00:00:00.000Z',
    totalCostKc: 2400,
    billedKwh: 320,
    fixedChargesKc: 600,
    variableChargesKc: 1800,
    components: {
      wholesale: { costKc: 1400, kwh: 210 },
      regulated: { costKc: 900, kwh: 110 },
      other: { costKc: 100, kwh: 20 },
    },
    status: 'open',
    lineItems: [
      { label: 'Wholesale energy', costKc: 1400, kwh: 210, component: 'wholesale' },
      { label: 'Distribution fee', costKc: 600, kwh: 0, component: 'regulated', fixed: true },
      { label: 'Metering service', costKc: 100, kwh: 0, fixed: true },
    ],
    notes: 'Verify January heat pump calibration.',
  },
]

vi.mock('../../data/DashboardDataProvider', () => ({
  useDashboardData: () => ({
    invoices: mockInvoices,
  }),
}))

describe('InvoicesSection', () => {
  it('renders invoice summary and toggles details', () => {
    render(<InvoicesSection />)

    expect(screen.getByText('Monthly invoices')).toBeInTheDocument()
    expect(screen.getByText('Total cost')).toBeInTheDocument()
    expect(screen.getByText('Show details')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /show details/i }))

    expect(screen.getByText('Wholesale energy')).toBeInTheDocument()
    expect(screen.getByText('Metering service')).toBeInTheDocument()
    expect(screen.getByText(/note:/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /hide details/i }))
    expect(screen.queryByText('Metering service')).not.toBeInTheDocument()
  })
})
