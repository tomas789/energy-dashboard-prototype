import './App.css'
import { DashboardDataProvider } from './modules/dashboard/data/DashboardDataProvider'
import { DashboardPage } from './modules/dashboard/DashboardPage'

function App() {
  return (
    <DashboardDataProvider>
      <div className="app-shell">
        <header className="app-shell__header">
          <div className="app-shell__title">
            <span>Household Energy Monitor</span>
            <span className="app-shell__title-badge">Prototype</span>
          </div>
          <p className="app-shell__subtitle">
            Interactive dashboard with mock API data for kWh and Kč monitoring.
          </p>
        </header>
        <main className="app-shell__content">
          <DashboardPage />
        </main>
      </div>
    </DashboardDataProvider>
  )
}

export default App
