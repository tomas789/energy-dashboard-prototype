import { useState } from 'react'
import { useDashboardData } from '../data/DashboardDataProvider'
import { formatCurrency, formatKwh, formatMonth } from '../../../utils/formatters'
import styles from './InvoicesSection.module.css'

const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid',
  open: 'Open',
  overdue: 'Overdue',
}

export function InvoicesSection() {
  const { invoices } = useDashboardData()
  const [expanded, setExpanded] = useState<string | null>(null)

  if (invoices.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="invoices-title">
      <header className={styles.header}>
        <div>
          <h2 id="invoices-title">Monthly invoices</h2>
          <p className={styles.subtitle}>Fixed and variable charges with component breakdown.</p>
        </div>
      </header>

      <div className={styles.list}>
        {invoices.map((invoice) => {
          const isExpanded = expanded === invoice.id
          return (
            <article key={invoice.id} className={styles.card}>
              <header className={styles.cardHeader}>
                <div>
                  <h3>{formatMonth(invoice.periodStart)}</h3>
                  <p className={styles.period}>
                    {new Date(invoice.periodStart).toLocaleDateString()} –{' '}
                    {new Date(invoice.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                <span className={styles.statusChip} data-status={invoice.status}>
                  {STATUS_LABEL[invoice.status]}
                </span>
              </header>
              <dl className={styles.metrics}>
                <div>
                  <dt>Total cost</dt>
                  <dd>{formatCurrency(invoice.totalCostKc)}</dd>
                </div>
                <div>
                  <dt>Billed energy</dt>
                  <dd>{formatKwh(invoice.billedKwh)}</dd>
                </div>
                <div>
                  <dt>Fixed charges</dt>
                  <dd>{formatCurrency(invoice.fixedChargesKc)}</dd>
                </div>
                <div>
                  <dt>Variable charges</dt>
                  <dd>{formatCurrency(invoice.variableChargesKc)}</dd>
                </div>
              </dl>

              <footer className={styles.cardFooter}>
                <div className={styles.componentSplit}>
                  <span>
                    Wholesale: {formatCurrency(invoice.components.wholesale.costKc)} (
                    {formatKwh(invoice.components.wholesale.kwh)})
                  </span>
                  <span>
                    Regulated: {formatCurrency(invoice.components.regulated.costKc)} (
                    {formatKwh(invoice.components.regulated.kwh)})
                  </span>
                  {invoice.components.other && (
                    <span>
                      Other: {formatCurrency(invoice.components.other.costKc)} (
                      {formatKwh(invoice.components.other.kwh)})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.toggleDetails}
                  onClick={() => setExpanded(isExpanded ? null : invoice.id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? 'Hide details' : 'Show details'}
                </button>
              </footer>

              {isExpanded && (
                <div className={styles.details}>
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Component</th>
                        <th>Kč</th>
                        <th>kWh</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lineItems.map((item) => (
                        <tr key={item.label}>
                          <td>{item.label}</td>
                          <td>{item.component ?? (item.fixed ? 'Fixed' : '—')}</td>
                          <td>{formatCurrency(item.costKc)}</td>
                          <td>{item.kwh ? formatKwh(item.kwh) : '—'}</td>
                          <td>{item.fixed ? 'Fixed' : 'Variable'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {invoice.notes && <p className={styles.notes}>Note: {invoice.notes}</p>}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
