import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError('Invalid credentials or server error')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-3 sm:px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl border-2 border-red-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-500 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 text-white">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-1">🏥 Hospital Audit System</h1>
            <p className="text-red-100 text-xs sm:text-sm">Sign in to your account</p>
          </div>
          <form onSubmit={handleSubmit} className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-5 md:pt-6 pb-6 sm:pb-7 md:pb-8 bg-white">
            {error && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 border-2 border-red-200 rounded-lg text-xs sm:text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="w-full border-2 border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@hospital.com"
                required
              />
            </div>
            <div className="mb-5 sm:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Password</label>
              <input
                type="password"
                className="w-full border-2 border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 sm:py-3 rounded-lg shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.02] text-xs sm:text-sm md:text-base"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
            <div className="mt-4 sm:mt-5 md:mt-6 pt-4 sm:pt-5 md:pt-6 border-t border-slate-200">
              <p className="text-[10px] sm:text-xs text-slate-500 text-center">
                Default Admin: <span className="font-mono">admin@hospital.com</span> /{' '}
                <span className="font-mono">Admin@123</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


