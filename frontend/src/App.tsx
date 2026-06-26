import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Clients from './pages/Clients'
import Settings from './pages/Settings'
import Shipments from './pages/Shipments'
import HistoricalSAD from './pages/HistoricalSAD'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-950 text-slate-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={
              <div className="flex min-h-screen items-center justify-center p-6 text-slate-400">
                <p>Dashboard Overview (In Progress) — Please use the Sidebar to navigate.</p>
              </div>
            } />
            <Route path="/clients" element={<Clients />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/historical-sad" element={<HistoricalSAD />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
