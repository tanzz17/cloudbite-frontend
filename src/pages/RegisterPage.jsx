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

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

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
    <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg flex flex-col transition-colors duration-300">
      <div className="flex justify-between items-center p-6">
        <CloudBiteLogo size="sm" />
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="mb-8 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Join CloudBite</h1>
            <p className="font-body text-gray-500 dark:text-gray-400 mt-2">Discover authentic home-cooked meals</p>
          </div>

          <div className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Full Name *</label>
                  <input type="text" value={form.name} onChange={set('name')} placeholder="Rahul Sharma" className="input-field" required />
                </div>
                <div>
                  <label className="input-label">Phone Number *</label>
                  <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className="input-field" required />
                </div>
              </div>

              <div>
                <label className="input-label">Email Address *</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="rahul@example.com" className="input-field" required />
              </div>

              <div>
                <label className="input-label">Password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
                    placeholder="Min. 6 characters" className="input-field pr-12" required minLength={6} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="input-label">Delivery Address</label>
                <textarea value={form.address} onChange={set('address')} placeholder="Your full address..."
                  className="input-field resize-none" rows={3} />
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base mt-2">
                {loading
                  ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</>
                  : <><span>🚀</span> Create Account</>}
              </button>
            </form>
          </div>

          <p className="text-center font-body text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-600 dark:text-orange-400 font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
