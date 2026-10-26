import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

interface Site {
  id: number
  clientName: string
  address: string
  latitude: number
  longitude: number
  roofAreaM2?: number | null
  peakKwp: number
}

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/')
      return
    }

    const fetchData = async () => {
      try {
        const [meRes, sitesRes] = await Promise.all([
          fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/sites', { headers: { Authorization: `Bearer ${token}` } })
        ])

        if (!meRes.ok) throw new Error('Session invalid')
        
        const meData = await meRes.json()
        setUserEmail(meData.email)

        if (sitesRes.ok) {
          const sitesData = await sitesRes.json()
          setSites(sitesData)
        }
      } catch (err) {
        localStorage.removeItem('token')
        navigate('/')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [navigate])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('token')
      navigate('/')
    }
  }

  if (isLoadingData || !userEmail) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sites Dashboard</h1>
            <p className="text-slate-500 text-sm">Logged in as {userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-70 text-slate-700 font-medium rounded-lg transition"
          >
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </button>
        </header>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold text-slate-800">
            Your Client Sites <span className="text-slate-500 font-normal text-base ml-2">({sites.length})</span>
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-white rounded-lg border border-slate-200 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  viewMode === 'table' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Table
              </button>
            </div>

            <Link
              to="/sites/new"
              className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition shadow-sm whitespace-nowrap"
            >
              + Add New Site
            </Link>
          </div>
        </div>

        {sites.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              🏢
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No sites yet</h3>
            {/* Could add some subtext message here, idk */}
            <p className="text-slate-500 mb-6"></p>
            <Link
              to="/sites/new"
              className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition shadow-sm inline-block"
            >
              + Add Site
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sites.map((site) => (
              <div key={site.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-5 flex-grow">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{site.clientName}</h3>
                  <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{site.address}</p>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="block text-slate-400 text-xs uppercase tracking-wider">Capacity</span>
                      <span className="font-medium text-slate-800">{site.peakKwp} kWp</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs uppercase tracking-wider">Roof Area</span>
                      <span className="font-medium text-slate-800">{site.roofAreaM2 ? `${site.roofAreaM2} m²` : 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-slate-400 text-xs uppercase tracking-wider">Coordinates</span>
                      <span className="font-medium text-slate-800">{site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                  <Link
                    to={`/sites/${site.id}`}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition shadow-sm text-center text-sm"
                  >
                    Open Assessment &rarr;
                  </Link>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => alert('Edit modal coming soon')}
                      className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium rounded-lg transition text-sm"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => alert('Delete confirmation coming soon')}
                      className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-red-50 text-red-600 font-medium rounded-lg transition text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client & Address</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roof Area</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Coordinates</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{site.clientName}</div>
                      <div className="text-sm text-slate-500 truncate max-w-[250px]">{site.address}</div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">{site.peakKwp} kWp</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{site.roofAreaM2 ? `${site.roofAreaM2} m²` : 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => alert('Edit modal coming soon')}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium rounded-lg transition text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => alert('Delete confirmation coming soon')}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-red-50 text-red-600 font-medium rounded-lg transition text-sm"
                        >
                          Delete
                        </button>
                        <Link
                          to={`/sites/${site.id}`}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition shadow-sm text-sm"
                        >
                          View &rarr;
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}