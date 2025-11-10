import { render, screen } from '@testing-library/react'
import { KpiCard } from '../KpiCard'

describe('KpiCard', () => {
  it('renders title, value, and delta', () => {
    render(
      <KpiCard
        title="Energy consumed"
        value="123 kWh"
        deltaLabel="▲ 5%"
        caption="Compared to yesterday"
        sparkline={[
          { timestamp: new Date().toISOString(), value: 0.5 },
          { timestamp: new Date().toISOString(), value: 0.7 },
        ]}
      />,
    )

    expect(screen.getByText('Energy consumed')).toBeInTheDocument()
    expect(screen.getByText('123 kWh')).toBeInTheDocument()
    expect(screen.getByText('▲ 5%')).toBeInTheDocument()
    expect(screen.getByText('Compared to yesterday')).toBeInTheDocument()
  })
})
