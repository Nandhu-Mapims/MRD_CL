import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login, loading, user, initializing } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Redirect if user is already logged in
  useEffect(() => {
    if (!initializing && user) {
      navigate('/', { replace: true })
    }
  }, [user, initializing, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const msg = err?.response?.data?.message
      setError(msg || 'Invalid credentials or server error')
    }
  }

  // Show loading while checking auth state
  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-3 sm:px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-indigo-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1">Hospital Audit System</h1>
            <p className="text-indigo-100 text-xs sm:text-sm">Sign in to your account</p>
          </div>
          <form 
            onSubmit={handleSubmit} 
            className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-5 md:pt-6 pb-6 sm:pb-7 md:pb-8 bg-white"
            autoComplete="off"
            data-form-type="other"
          >
            {error && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 border-2 border-red-300 rounded-lg text-xs sm:text-sm text-red-700 shadow-sm">
                {error}
              </div>
            )}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="w-full border-2 border-indigo-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@hospital.com"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                required
              />
            </div>
            <div className="mb-5 sm:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Password</label>
              <input
                type="password"
                className="w-full border-2 border-indigo-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2.5 sm:py-3 rounded-lg shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}


