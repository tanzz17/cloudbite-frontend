import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle, CloudBiteLogo } from '../components/common/index'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || !form.phone) {
      toast.error('Please fill all required fields')
      return
    }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    try {
      setLoading(true)
      await register(form)
      navigate('/home', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
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
            Join the<br />
            <span className="font-hand italic">CloudBite</span><br />
            family today.
          </h2>
          <p className="text-white/70 font-body text-lg max-w-sm">
            Get authentic home-cooked meals delivered from passionate cooks in your community.
          </p>
        </div>
      </div>

      {/* Right - Registration Form */}
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
              <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Create an account 🍽️</h1>
              <p className="font-body text-gray-500 dark:text-gray-400 mt-2">Join CloudBite to discover authentic home-cooked meals</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Rahul Sharma"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="input-label">Phone Number *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="input-label">Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="rahul@example.com"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="input-label">Password *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 characters"
                    className="input-field pr-12"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="input-label">Delivery Address</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Your house number, street, area, city..."
                  className="input-field resize-none"
                  rows={3}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
                {loading
                  ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</>
                  : <><span>🚀</span> Create Account</>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="font-body text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-orange-600 dark:text-orange-400 font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
