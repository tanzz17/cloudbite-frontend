import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { ThemeToggle } from '../../components/common/index'
import { formatCurrency } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Maharashtra cuisine slides ────────────────────────────────────────────────
const CUISINE_SLIDES = [
  { label: 'Breakfast',    emoji: '🌅', desc: 'Start your morning right',  dishes: ['Poha', 'Upma', 'Sabudana Khichdi', 'Thalipeeth'], color: 'from-yellow-400 to-amber-500',  bg: 'from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20' },
  { label: 'Starters',     emoji: '🌶️', desc: 'Fire up your appetite',     dishes: ['Misal Pav', 'Bhel Puri', 'Kanda Bhaji', 'Vada Pav'], color: 'from-red-400 to-rose-500',   bg: 'from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20' },
  { label: 'Main Course',  emoji: '🍛', desc: 'The heart of every meal',   dishes: ['Varan Bhat', 'Puran Poli', 'Bharli Vangi', 'Masala Bhat'], color: 'from-orange-400 to-amber-500', bg: 'from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20' },
  { label: 'Desserts',     emoji: '🍮', desc: 'End on a sweet note',       dishes: ['Modak', 'Shrikhand', 'Basundi', 'Puran Poli'], color: 'from-pink-400 to-rose-500',  bg: 'from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20' },
]

// ── Recommendation engine ─────────────────────────────────────────────────────
const getRecommendations = (cart, allMenuItems) => {
  if (!cart?.items?.length || !allMenuItems?.length) return []
  const cartCategories = cart.items.map(i => (i.menuItem?.category || '').toLowerCase())
  const cartNames = cart.items.map(i => (i.menuItem?.name || '').toLowerCase())
  const cartText = [...cartCategories, ...cartNames].join(' ')

  const rules = [
    { trigger: ['breakfast', 'poha', 'upma', 'sabudana', 'thalipeeth'], suggest: ['beverage', 'chai', 'juice', 'lassi', 'coffee'] },
    { trigger: ['starter', 'misal', 'bhaji', 'spicy', 'vada'], suggest: ['dessert', 'shrikhand', 'lassi', 'basundi'] },
    { trigger: ['main', 'curry', 'sabji', 'rice', 'varan', 'masala'], suggest: ['dessert', 'bread', 'roti', 'modak', 'shrikhand'] },
    { trigger: ['pav', 'sandwich', 'burger'], suggest: ['chai', 'beverage', 'coffee', 'lassi'] },
  ]

  let suggestKeywords = []
  for (const rule of rules) {
    if (rule.trigger.some(t => cartText.includes(t))) suggestKeywords.push(...rule.suggest)
  }

  const suggestions = allMenuItems.filter(item => {
    const itemText = `${item.name} ${item.category} ${item.description || ''}`.toLowerCase()
    return !cartNames.includes((item.name || '').toLowerCase())
      && item.isAvailable
      && (suggestKeywords.length ? suggestKeywords.some(k => itemText.includes(k)) : item.isBestSeller)
  })

  return suggestions.length ? suggestions.slice(0, 4)
    : allMenuItems.filter(m => m.isBestSeller && !cartNames.includes((m.name || '').toLowerCase())).slice(0, 4)
}

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', emoji: '🌅' }
  if (h < 17) return { text: 'Good afternoon', emoji: '☀️' }
  if (h < 21) return { text: 'Good evening', emoji: '🌆' }
  return { text: 'Good night', emoji: '🌙' }
}

// ── Kitchen Card ──────────────────────────────────────────────────────────────
const KitchenCard = ({ kitchen, onClick, index }) => (
  <div onClick={onClick}
    className="group relative bg-white dark:bg-[#1a1108] rounded-3xl overflow-hidden border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-2xl hover:shadow-amber-400/10 hover:-translate-y-2 transition-all duration-400 cursor-pointer animate-slide-up"
    style={{ animationDelay: `${index * 0.07}s` }}>
    <div className="relative h-44 overflow-hidden">
      {kitchen.coverImage
        ? <img src={kitchen.coverImage} alt={kitchen.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        : <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-7xl">🍽️</div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute top-3 left-3">
        {kitchen.isOpen
          ? <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />OPEN</span>
          : <span className="bg-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg">CLOSED</span>}
      </div>
      <div className="absolute bottom-3 left-3 flex items-end gap-2">
        <div className="w-10 h-10 rounded-xl border-2 border-white shadow-lg bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
          {kitchen.logoImage ? <img src={kitchen.logoImage} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">🏠</span>}
        </div>
        <div>
          <p className="font-display font-bold text-white text-sm drop-shadow">{kitchen.name}</p>
          <p className="text-white/70 text-[10px] font-body">{kitchen.cuisineType || 'Home Kitchen'}</p>
        </div>
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-center gap-3 text-xs font-body mb-2">
        <span className="font-bold text-amber-600 dark:text-amber-400">⭐ {kitchen.rating?.toFixed(1) || 'New'}</span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span className="text-gray-500 dark:text-gray-400">⏱️ {kitchen.estimatedDeliveryTime || 30} min</span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span className="text-gray-500 dark:text-gray-400">🚚 {formatCurrency(kitchen.deliveryFee)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-body text-gray-400">Min. {formatCurrency(kitchen.minOrderAmount)}</span>
        <span className="text-xs font-body font-bold text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">View Menu →</span>
      </div>
    </div>
  </div>
)

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerHome() {
  const { user, logout } = useAuth()
  const { cart, cartCount } = useCart()
  const navigate = useNavigate()
  const greeting = getGreeting()

  const [kitchens, setKitchens] = useState([])
  const [allMenuItems, setAllMenuItems] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [cuisineFilter, setCuisineFilter] = useState('All')
  const [slideIndex, setSlideIndex] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const searchTimeout = useRef(null)

  // Auto-rotate slider every 4s
  useEffect(() => {
    const t = setInterval(() => setSlideIndex(p => (p + 1) % CUISINE_SLIDES.length), 4000)
    return () => clearInterval(t)
  }, [])

  // Fetch kitchens + sample menu items
  useEffect(() => {
    customerAPI.getKitchens()
      .then(async r => {
        setKitchens(r.data)
        const menus = await Promise.all(
          r.data.slice(0, 6).map(k => customerAPI.getMenu(k.id).then(m => m.data.map(item => ({ ...item, kitchenId: k.id }))).catch(() => []))
        )
        setAllMenuItems(menus.flat())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Recommendations when cart changes
  useEffect(() => {
    if (allMenuItems.length) setRecommendations(getRecommendations(cart, allMenuItems))
  }, [cart, allMenuItems])

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current)
    if (!search.trim()) { setSearchResults(null); return }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      try { const { data } = await customerAPI.searchKitchens(search); setSearchResults(data) }
      catch { }
      finally { setSearchLoading(false) }
    }, 400)
  }, [search])

  const displayed = searchResults
    ?? (cuisineFilter === 'All' ? kitchens : kitchens.filter(k => k.cuisineType?.toLowerCase().includes(cuisineFilter.toLowerCase())))

  const slide = CUISINE_SLIDES[slideIndex]

  return (
    <div className="min-h-screen bg-[#fdf8f0] dark:bg-[#0f0a05] transition-colors duration-500">

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-[#fdf8f0]/95 dark:bg-[#0f0a05]/95 backdrop-blur-xl border-b border-amber-100 dark:border-amber-900/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-2 rounded-xl transition-colors font-body font-semibold text-sm flex-shrink-0">
            ← Home
          </button>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-2xl">🍽️</span>
            <span className="font-display font-bold text-xl hidden sm:block">
              <span className="text-amber-600 dark:text-amber-400">Cloud</span><span className="font-hand text-orange-500">Bite</span>
            </span>
          </div>
          <div className="flex-1 max-w-2xl mx-auto relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 text-sm">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search kitchens, dishes..."
              className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none font-body text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-all" />
            {searchLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
            {search && !searchLoading && (
              <button onClick={() => { setSearch(''); setSearchResults(null) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none">×</button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <button onClick={() => navigate('/cart')} className="relative p-2">
              <span className="text-xl">🛒</span>
              {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce">{cartCount}</span>}
            </button>
            <button onClick={() => navigate('/orders')} className="p-2 text-xl hidden sm:block" title="Orders">📋</button>
            <div className="relative">
              <button onClick={() => setProfileOpen(p => !p)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {user?.name?.[0]?.toUpperCase()}
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#1a1108] rounded-2xl shadow-2xl border border-amber-100 dark:border-amber-900 py-2 z-50 animate-slide-down">
                    <div className="px-4 py-2 border-b border-amber-100 dark:border-amber-900">
                      <p className="font-body font-bold text-sm text-gray-900 dark:text-white truncate">{user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                    {[['👤', 'My Profile', '/profile'], ['📋', 'My Orders', '/orders'], ['🛒', 'My Cart', '/cart']].map(([icon, label, path]) => (
                      <button key={label} onClick={() => { navigate(path); setProfileOpen(false) }}
                        className="w-full text-left px-4 py-2.5 font-body text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-2">
                        {icon} {label}
                      </button>
                    ))}
                    <div className="border-t border-amber-100 dark:border-amber-900 mt-1 pt-1">
                      <button onClick={() => { logout(); navigate('/', { replace: true }) }}
                        className="w-full text-left px-4 py-2.5 font-body text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2">
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-10">

        {/* ── GREETING ─────────────────────────────────────────── */}
        <div>
          <p className="font-hand text-2xl text-amber-600 dark:text-amber-400">
            {greeting.emoji} {greeting.text}, {user?.name?.split(' ')[0]}!
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-1">
            What's cooking today?
          </h1>
          {user?.address && (
            <p className="font-body text-sm text-gray-500 dark:text-gray-400 mt-1">
              📍 Delivering to: <span className="font-semibold text-gray-700 dark:text-gray-300">{user.address}</span>
            </p>
          )}
        </div>

        {/* ── CUISINE AUTO-SLIDER ───────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl">
          <div key={slideIndex}
            style={{ animation: 'slideIn 0.45s cubic-bezier(0.22,1,0.36,1)' }}
            className={`relative h-52 md:h-64 bg-gradient-to-br ${slide.bg} border border-amber-200 dark:border-amber-800 rounded-3xl overflow-hidden`}>
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="relative z-10 h-full flex items-center px-8 md:px-12 gap-8">
              <div className="flex-1 min-w-0">
                <span className={`inline-block font-body font-bold text-xs px-3 py-1 rounded-full bg-gradient-to-r ${slide.color} text-white mb-3`}>
                  {slide.emoji} {slide.label}
                </span>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">{slide.desc}</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {slide.dishes.map(d => (
                    <span key={d} className="font-body text-xs bg-white/60 dark:bg-white/10 backdrop-blur-sm text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">{d}</span>
                  ))}
                </div>
                <button onClick={() => { setCuisineFilter(slide.label); setSearch('') }}
                  className={`font-body font-bold text-sm px-5 py-2.5 rounded-xl bg-gradient-to-r ${slide.color} text-white hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200`}>
                  Explore {slide.label} →
                </button>
              </div>
              <div className="text-7xl md:text-8xl flex-shrink-0 animate-float hidden sm:block">{slide.emoji}</div>
            </div>
          </div>
          {/* Controls */}
          <button onClick={() => setSlideIndex(p => (p - 1 + CUISINE_SLIDES.length) % CUISINE_SLIDES.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 dark:text-gray-300 hover:scale-110 transition-transform z-20 text-xl">
            ‹
          </button>
          <button onClick={() => setSlideIndex(p => (p + 1) % CUISINE_SLIDES.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 dark:text-gray-300 hover:scale-110 transition-transform z-20 text-xl">
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {CUISINE_SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlideIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === slideIndex ? 'w-6 bg-amber-500' : 'w-1.5 bg-amber-300/50'}`} />
            ))}
          </div>
        </div>

        {/* ── RECOMMENDATIONS ──────────────────────────────────── */}
        {recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>✨</span> Recommended for you
                </h2>
                <p className="font-body text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  {cart?.items?.length ? 'Based on what\'s in your cart' : 'Popular dishes right now'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendations.map((item, i) => (
                <div key={item.id}
                  className="group bg-white dark:bg-[#1a1108] rounded-2xl overflow-hidden border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/kitchen-menu/${item.kitchen?.id || item.kitchenId}`)}>
                  <div className="h-28 bg-amber-50 dark:bg-amber-900/20 overflow-hidden relative flex items-center justify-center">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-400" />
                      : <span className="text-4xl">{item.isVeg ? '🥬' : '🍖'}</span>}
                    <span className={`absolute top-2 left-2 w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                    </span>
                    {item.isBestSeller && <span className="absolute top-2 right-2 text-[9px] font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-md">⭐ BEST</span>}
                  </div>
                  <div className="p-3">
                    <p className="font-display font-bold text-sm text-gray-900 dark:text-white truncate">{item.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-body font-bold text-amber-600 dark:text-amber-400 text-sm">{formatCurrency(item.price)}</span>
                      <span className="text-[10px] font-body font-bold px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        + Add
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CUISINE FILTER TABS ───────────────────────────────── */}
        <div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-6">
            {[
              { key: 'All',         icon: '🏪' },
              { key: 'Breakfast',   icon: '🌅' },
              { key: 'Starters',    icon: '🌶️' },
              { key: 'Main Course', icon: '🍛' },
              { key: 'Desserts',    icon: '🍮' },
            ].map(({ key, icon }) => (
              <button key={key}
                onClick={() => { setCuisineFilter(key); setSearch(''); setSearchResults(null) }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-body font-bold text-sm whitespace-nowrap flex-shrink-0 transition-all duration-300 ${
                  cuisineFilter === key
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-400/30 scale-105'
                    : 'bg-white dark:bg-[#1a1108] text-gray-600 dark:text-gray-400 border border-amber-100 dark:border-amber-900/60 hover:border-amber-300 hover:shadow-md'
                }`}>
                <span>{icon}</span>
                <span>{key}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {searchResults ? `Results for "${search}"` : cuisineFilter === 'All' ? 'All Cloud Kitchens 🏪' : `${cuisineFilter} Kitchens`}
            </h2>
            <span className="font-body text-sm text-amber-600 dark:text-amber-400 font-semibold">
              {displayed.length} kitchen{displayed.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-3xl bg-amber-100/50 dark:bg-amber-900/10 animate-pulse" />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-7xl mb-4 animate-bounce-soft">🔍</div>
              <p className="font-display text-2xl font-bold text-gray-700 dark:text-gray-300">No kitchens found</p>
              <p className="font-body text-gray-500 mt-2">Try a different cuisine or search term</p>
              <button onClick={() => { setCuisineFilter('All'); setSearch(''); setSearchResults(null) }}
                className="mt-5 font-body font-bold text-sm px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg transition-all">
                Show All Kitchens
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map((kitchen, i) => (
                <KitchenCard key={kitchen.id} kitchen={kitchen} index={i}
                  onClick={() => navigate(`/kitchen-menu/${kitchen.id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* ── BOTTOM BANNER ────────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-r from-amber-900 to-orange-900 p-8 flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 text-[150px] opacity-10 pointer-events-none">🏠</div>
          <div className="relative z-10">
            <p className="font-hand text-amber-300 text-xl mb-1">आपल्या घरचं जेवण 🏠</p>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-white">Real Home Food, Real Love</h3>
            <p className="font-body text-white/70 mt-1 text-sm max-w-md">Every kitchen on CloudBite is run by a passionate home cook — no dine-in, just authentic Maharashtra flavours.</p>
          </div>
          <button onClick={() => navigate('/orders')}
            className="relative z-10 flex items-center gap-2 bg-white text-amber-700 font-body font-bold px-6 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all">
            📋 Track My Orders →
          </button>
        </div>
      </div>

      {/* ── STICKY CART BAR ──────────────────────────────────── */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4 pointer-events-none">
          <button onClick={() => navigate('/cart')}
            className="pointer-events-auto flex items-center gap-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-8 py-4 rounded-2xl shadow-2xl shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all duration-300">
            <span>🛒 {cartCount} item{cartCount !== 1 ? 's' : ''} in cart</span>
            <span className="w-px h-5 bg-white/30" />
            <span>View Cart →</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>
    </div>
  )
}
