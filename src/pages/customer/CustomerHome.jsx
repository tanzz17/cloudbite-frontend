import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { CloudBiteLogo, ThemeToggle } from '../../components/common/index'
import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/helpers'
import toast from 'react-hot-toast'

const CUISINE_FILTERS = ['All', 'North Indian', 'South Indian', 'Chinese', 'Italian', 'Biryani', 'Snacks', 'Desserts', 'Beverages']

export default function CustomerHome() {
  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [cuisine, setCuisine] = useState('All')
  const { user } = useAuth()
  const { cartCount } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    customerAPI.getKitchens()
      .then(r => setKitchens(r.data))
      .catch(() => toast.error('Failed to load kitchens'))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = async () => {
    if (!search.trim()) { setSearchResults(null); return }
    try {
      const { data } = await customerAPI.searchKitchens(search)
      setSearchResults(data)
    } catch { toast.error('Search failed') }
  }

  const displayed = searchResults ?? (
    cuisine === 'All' ? kitchens : kitchens.filter(k => k.cuisineType?.toLowerCase().includes(cuisine.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-20 glass border-b border-orange-100 dark:border-brand-dark-border px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <CloudBiteLogo size="md" />
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); if (!e.target.value) setSearchResults(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search cloud kitchens, cuisines..."
                className="input-field pl-10 pr-20 py-2.5"
              />
              <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-gradient text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                Search
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => navigate('/cart')} className="relative text-2xl">
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-soft">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => navigate('/orders')} className="text-2xl">📋</button>
            <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-orange-gradient flex items-center justify-center text-white font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden bg-orange-gradient p-8 md:p-12 mb-10">
          <div className="absolute inset-0 hero-pattern opacity-20" />
          <div className="absolute -right-10 -bottom-10 text-[160px] opacity-20">🍽️</div>
          <div className="relative z-10">
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white leading-tight mb-3">
              Real food from<br /><span className="font-hand italic">real kitchens</span>
            </h1>
            <p className="text-white/80 font-body text-lg mb-6 max-w-md">
              Discover authentic home-cooked meals from cloud kitchens near you. No dine-in gimmicks — just pure flavour.
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-white/70 text-xs font-body">Hello 👋</p>
                <p className="text-white font-display font-bold">{user?.name?.split(' ')[0]}</p>
              </div>
              {user?.address && (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                  <p className="text-white/70 text-xs font-body">📍 Delivery to</p>
                  <p className="text-white font-body text-sm truncate max-w-[200px]">{user.address}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cuisine filters */}
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-3">What are you craving?</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CUISINE_FILTERS.map(c => (
              <button key={c} onClick={() => { setCuisine(c); setSearchResults(null); setSearch('') }}
                className={`px-4 py-2 rounded-xl text-sm font-body font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  cuisine === c ? 'bg-orange-gradient text-white shadow-orange' : 'bg-white dark:bg-brand-dark-card text-gray-600 dark:text-gray-400 border border-orange-100 dark:border-brand-dark-border hover:border-orange-300'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Kitchens */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">
              {searchResults ? `Results for "${search}"` : 'Cloud Kitchens Near You'} 🏪
            </h2>
            <p className="text-sm font-body text-gray-500 dark:text-gray-400">{displayed.length} kitchens</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-3xl shimmer" />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏪</div>
              <p className="font-display text-xl font-bold text-gray-700 dark:text-gray-300">No kitchens found</p>
              <p className="font-body text-gray-500 mt-2">Try a different search or cuisine filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map(kitchen => (
                <div key={kitchen.id} onClick={() => navigate(`/kitchen-menu/${kitchen.id}`)}
                  className="kitchen-card animate-slide-up group">
                  {kitchen.coverImage ? (
                    <img src={kitchen.coverImage} alt={kitchen.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-48 bg-orange-gradient flex items-center justify-center text-6xl">🍽️</div>
                  )}
                  {!kitchen.isOpen && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-white text-gray-800 font-display font-bold px-4 py-2 rounded-xl">
                        🔴 Currently Closed
                      </span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-100 dark:border-orange-900/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {kitchen.logoImage ? <img src={kitchen.logoImage} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">🍽️</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-gray-900 dark:text-white truncate">{kitchen.name}</h3>
                        <p className="text-xs font-body text-gray-500 dark:text-gray-400">{kitchen.cuisineType || 'Multi-cuisine'}</p>
                        <p className="text-xs font-body text-gray-400">📍 {kitchen.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-orange-50 dark:border-brand-dark-border">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs font-body font-bold text-yellow-600">
                          ⭐ {kitchen.rating?.toFixed(1) || 'New'}
                        </span>
                        <span className="text-xs font-body text-gray-400">
                          ⏱️ {kitchen.estimatedDeliveryTime || 30} min
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-body text-gray-500">
                          🚚 {formatCurrency(kitchen.deliveryFee)}
                        </span>
                        {kitchen.isOpen && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg">OPEN</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
