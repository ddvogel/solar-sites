import React, { useState, useEffect } from 'react'

export default function App() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // verify session on initial load or token update
  useEffect(() => {
    if (!token) {
      setUserEmail(null)
      return
    }

    fetch('/api/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session invalid')
        const data = await res.json()
        setUserEmail(data.email)
      })
      .catch(() => {
        handleLogout()
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const endpoint = isRegister ? '/api/register' : '/api/login'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'An error occurred during authentication')
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
        setEmail('')
        setPassword('')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('token')
      setToken(null)
      setUserEmail(null)
    }
  }

  if (userEmail) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">You are logged in!</h2>
          <p className="text-slate-500 mt-2">
            Welcome back, <span className="font-medium text-slate-700">{userEmail}</span>
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition"
          >
            Log Out
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Praeter Solar Sites</h1>
        <p className="text-sm text-slate-500 mb-6">
          {isRegister ? 'Create an advisor account' : 'Log in to view and manage your sites'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="advisor@praeter.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition shadow-sm"
          >
            {isRegister ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setError(null)
            }}
            className="text-amber-600 hover:underline font-medium ml-1"
          >
            {isRegister ? 'Sign In' : 'Register here'}
          </button>
        </div>
      </div>
    </main>
  )
}