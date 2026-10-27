import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

interface MonthProduction {
  month: number
  kwh: number
}

interface ProductionData {
  yearlyKwh: number
  monthlyKwh: MonthProduction[]
}

interface BatteryScenario {
  selfUsedKwh: number
  exportedKwh: number
  selfConsumptionPercentage: number
  batteryAddedKwh?: number
}

interface BatteryData {
  productionKwh: number
  consumptionKwh: number
  withoutBattery: BatteryScenario
  withBattery: BatteryScenario
}

interface Site {
  id: number
  clientName: string
  address: string
  peakKwp: number
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Assessment() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [site, setSite] = useState<Site | null>(null)
  const [production, setProduction] = useState<ProductionData | null>(null)
  const [batteryData, setBatteryData] = useState<BatteryData | null>(null)
  
  const [annualUseKwh, setAnnualUseKwh] = useState<number>(3500)
  const [capacityKwh, setCapacityKwh] = useState<number>(5.0)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // initial data fetch (Site & Production)
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/')
      return
    }

    const fetchInitialData = async () => {
      try {
        const [siteRes, prodRes] = await Promise.all([
          fetch(`/api/sites/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/sites/${id}/production`, { headers: { Authorization: `Bearer ${token}` } })
        ])

        if (!siteRes.ok) throw new Error('Failed to load site details')
        const siteJson = await siteRes.json()
        setSite(siteJson)

        if (!prodRes.ok) {
          const err = await prodRes.json()
          throw new Error(err.detail || 'Failed to load PVGIS production data')
        }
        const prodJson = await prodRes.json()
        setProduction(prodJson)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [id, navigate])

  // Debounced Battery Simulation Fetch
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || annualUseKwh <= 0 || capacityKwh < 0) return

    const fetchBatterySimulation = async () => {
      setIsSimulating(true)
      try {
        const res = await fetch(`/api/sites/${id}/battery?capacityKwh=${capacityKwh}&annualUseKwh=${annualUseKwh}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setBatteryData(data)
        }
      } catch (err) {
        console.error('Simulation error:', err)
      } finally {
        setIsSimulating(false)
      }
    }

    const debounceTimer = setTimeout(fetchBatterySimulation, 500)
    return () => clearTimeout(debounceTimer)
  }, [id, annualUseKwh, capacityKwh])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-amber-500 rounded-full border-4 border-slate-200 border-t-amber-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Assessment Failed</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link to="/dashboard" className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const maxMonth = production ? Math.max(...production.monthlyKwh.map(m => m.kwh)) : 1

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <Link to="/dashboard" className="text-sm text-amber-600 hover:text-amber-700 font-medium mb-1 inline-block">&larr; Back to sites</Link>
            <h1 className="text-2xl font-bold text-slate-900">{site?.clientName}</h1>
            <p className="text-slate-500 text-sm">{site?.address} &bull; {site?.peakKwp} kWp System</p>
          </div>
        </header>

        {/* Section 1: Solar Production */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3 flex flex-col justify-center">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Estimated Annual Yield</h2>
              <div className="text-5xl font-extrabold text-slate-900 mb-2">
                {production?.yearlyKwh.toLocaleString()} <span className="text-2xl text-slate-500 font-medium">kWh</span>
              </div>
              <p className="text-sm text-slate-500">Calculated via PVGIS for optimal angles.</p>
            </div>
            
            <div className="md:w-2/3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Monthly Breakdown</h2>
              <div className="flex items-end gap-2 h-48 mt-4">
                {production?.monthlyKwh.map((data, i) => (
                  <div key={data.month} className="flex-1 flex flex-col justify-end items-center gap-2 group h-full">
                    {/* Inner wrapper ensures the percentage height works correctly */}
                    <div className="w-full flex-1 flex items-end">
                      <div 
                        className="w-full bg-amber-400 rounded-t-sm transition-all duration-500 relative group-hover:bg-amber-500"
                        style={{ height: `${(data.kwh / maxMonth) * 100}%`, minHeight: '4px' }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded pointer-events-none transition z-10">
                          {Math.round(data.kwh)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{MONTH_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Battery Simulator */}
        <section className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-800 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>☀️</span> Interactive Battery Modeler
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Annual Electricity Use (kWh)</label>
                <input 
                  type="number" 
                  value={annualUseKwh} 
                  onChange={(e) => setAnnualUseKwh(Number(e.target.value))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Battery Capacity (kWh)</label>
                <input 
                  type="number" 
                  step="0.5"
                  value={capacityKwh} 
                  onChange={(e) => setCapacityKwh(Number(e.target.value))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <div className={`transition-opacity duration-300 ${isSimulating ? 'opacity-50' : 'opacity-100'}`}>
              {batteryData && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Without Battery Card */}
                    <div className="bg-slate-800 p-5 rounded-lg border border-slate-600">
                      <h3 className="text-slate-400 font-medium mb-4 uppercase text-sm tracking-wider">Without Battery</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="text-3xl font-bold text-white">{batteryData.withoutBattery.selfConsumptionPercentage}%</div>
                          <div className="text-sm text-slate-400">Self-Consumption</div>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-3 text-sm">
                          <span className="text-slate-400">Directly Used</span>
                          <span className="font-medium">{batteryData.withoutBattery.selfUsedKwh.toLocaleString()} kWh</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-3 text-sm">
                          <span className="text-slate-400">Exported to Grid</span>
                          <span className="font-medium">{batteryData.withoutBattery.exportedKwh.toLocaleString()} kWh</span>
                        </div>
                      </div>
                    </div>

                    {/* With Battery Card */}
                    <div className="bg-slate-800 p-5 rounded-lg border border-amber-500/30 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-bl-lg">SIMULATED</div>
                      <h3 className="text-slate-400 font-medium mb-4 uppercase text-sm tracking-wider">With {capacityKwh} kWh Battery</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="text-3xl font-bold text-amber-400">{batteryData.withBattery.selfConsumptionPercentage}%</div>
                          <div className="text-sm text-slate-400">Self-Consumption</div>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-3 text-sm">
                          <span className="text-slate-400">Directly Used + Batt</span>
                          <span className="font-medium text-amber-100">{batteryData.withBattery.selfUsedKwh.toLocaleString()} kWh</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-3 text-sm">
                          <span className="text-slate-400">Exported to Grid</span>
                          <span className="font-medium">{batteryData.withBattery.exportedKwh.toLocaleString()} kWh</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sell Metric */}
                  <div className="bg-amber-500 text-slate-800 p-4 rounded-lg flex items-center justify-between font-medium">
                    <div>
                      Adding a <span className="font-bold">{capacityKwh} kWh</span> battery increases self-consumption by:
                    </div>
                    <div className="text-2xl font-black">
                      +{batteryData.withBattery.batteryAddedKwh?.toLocaleString()} kWh
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}