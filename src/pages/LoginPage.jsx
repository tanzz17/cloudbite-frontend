import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle, CloudBiteLogo } from '../components/common/index'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Please fill all fields'); return }
    try {
      setLoading(true)
      const user = await login(form.email, form.password)
      const routes = { ADMIN: '/admin', KITCHEN_OWNER: '/kitchen', CUSTOMER: '/home', DELIVERY_PARTNER: '/delivery' }
      navigate(routes[user.role] || '/home', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg flex transition-colors duration-300">
      {/* Left - Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-orange-gradient p-12 relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern opacity-20" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute top-20 -left-10 w-40 h-40 bg-white/10 rounded-full" />

        <div className="relative z-10">
          <CloudBiteLogo size="lg" showText={true} />
          <p className="text-white/80 font-hand text-xl mt-2">Where home kitchens shine ✨</p>
        </div>

        <div className="relative z-10">
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Real food,<br />
            real <span className="font-hand italic">people</span>,<br />
            real flavour.
          </h2>
          <p className="text-white/70 font-body text-lg max-w-sm">
            Supporting cloud kitchens and home cooks who bring authentic meals straight to your door.
          </p>
        </div>

        <div className="relative z-10 flex gap-6">
          {['500+ Kitchens', '10K+ Orders', '4.8★ Rating'].map(stat => (
            <div key={stat} className="text-center">
              <p className="text-white font-display font-bold text-lg">{stat.split(' ')[0]}</p>
              <p className="text-white/70 font-body text-xs">{stat.split(' ').slice(1).join(' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center p-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-brand-dark-border dark:text-orange-400 dark:hover:bg-brand-dark-card transition-all"
            >
              <span aria-hidden="true">←</span>
              <span className="font-body font-semibold text-sm">Back to Landing</span>
            </Link>
            <div className="lg:hidden"><CloudBiteLogo size="sm" /></div>
          </div>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md animate-slide-up">
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Welcome back! 👋</h1>
              <p className="font-body text-gray-500 dark:text-gray-400 mt-2">Sign in to your CloudBite account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label">Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="input-label">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Enter your password"
                    className="input-field pr-12"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
                {loading ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                         : <><span>🍽️</span> Sign In</>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="font-body text-sm text-gray-500 dark:text-gray-400">
                New to CloudBite?{' '}
                <Link to="/register" className="text-orange-600 dark:text-orange-400 font-bold hover:underline">
                  Create an account
                </Link>
              </p>
            </div>

            <div className="mt-8 p-4 bg-orange-50 dark:bg-brand-dark-card rounded-2xl border border-orange-100 dark:border-brand-dark-border">
              <p className="font-hand text-orange-600 dark:text-orange-400 text-sm text-center font-semibold">
                🔑 Kitchen owners & delivery partners receive login credentials from admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
