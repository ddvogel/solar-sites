import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/')
      return
    }

    fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session invalid')
        const data = await res.json()
        setUserEmail(data.email)
      })
      .catch(() => {
        localStorage.removeItem('token')
        navigate('/')
      })
  }, [navigate])

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('token')
      navigate('/')
    }
  }

  if (!userEmail) {
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
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sites Dashboard</h1>
            <p className="text-slate-500 text-sm">Logged in as {userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-70 text-slate-700 font-medium rounded-lg transition flex justify-center items-center"
          >
            {isLoading ? 'Logging out...' : 'Log Out'}
          </button>
        </header>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Your Client Sites</h2>
          <Link
            to="/sites/new"
            className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition shadow-sm"
          >
            + Add New Site
          </Link>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500">You get so many cool and epic sites here at some point 🫨</p>
        </div>
      </div>
    </main>
  )
}