import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/helpers'
import AddressModal from '../../components/customer/AddressModal'

const CUISINE_SLIDES = [
  { label: 'Breakfast', emoji: '🌅', desc: 'Start your morning right', dishes: ['Poha', 'Upma', 'Sabudana Khichdi', 'Thalipeeth'], color: 'from-yellow-400 to-amber-500', bg: 'from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20', accent: '#f59e0b' },
  { label: 'Starters', emoji: '🌶️', desc: 'Fire up your appetite', dishes: ['Misal Pav', 'Bhel Puri', 'Kanda Bhaji', 'Vada Pav'], color: 'from-red-400 to-rose-500', bg: 'from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20', accent: '#f43f5e' },
  { label: 'Main Course', emoji: '🍛', desc: 'The heart of every meal', dishes: ['Varan Bhat', 'Puran Poli', 'Bharli Vangi', 'Masala Bhat'], color: 'from-orange-400 to-amber-500', bg: 'from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20', accent: '#f97316' },
  { label: 'Desserts', emoji: '🍮', desc: 'End on a sweet note', dishes: ['Modak', 'Shrikhand', 'Basundi', 'Puran Poli'], color: 'from-pink-400 to-rose-500', bg: 'from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20', accent: '#ec4899' },
]

const getRecommendations = (cart, allMenuItems) => {
  if (!cart?.items?.length || !allMenuItems?.length) return []
  const cartCategories = cart.items.map((item) => (item.menuItem?.category || '').toLowerCase())
  const cartNames = cart.items.map((item) => (item.menuItem?.name || '').toLowerCase())
  const cartText = [...cartCategories, ...cartNames].join(' ')
  const rules = [
    { trigger: ['breakfast', 'poha', 'upma', 'sabudana', 'thalipeeth'], suggest: ['beverage', 'chai', 'juice', 'lassi', 'coffee'] },
    { trigger: ['starter', 'misal', 'bhaji', 'spicy', 'vada'], suggest: ['dessert', 'shrikhand', 'lassi', 'basundi'] },
    { trigger: ['main', 'curry', 'sabji', 'rice', 'varan', 'masala'], suggest: ['dessert', 'bread', 'roti', 'modak', 'shrikhand'] },
    { trigger: ['pav', 'sandwich', 'burger'], suggest: ['chai', 'beverage', 'coffee', 'lassi'] },
  ]
  const suggestKeywords = []
  for (const rule of rules) {
    if (rule.trigger.some((token) => cartText.includes(token))) {
      suggestKeywords.push(...rule.suggest)
    }
  }
  const suggestions = allMenuItems.filter((item) => {
    const itemText = `${item.name} ${item.category} ${item.description || ''}`.toLowerCase()
    return !cartNames.includes((item.name || '').toLowerCase()) && item.isAvailable && (suggestKeywords.length ? suggestKeywords.some((keyword) => itemText.includes(keyword)) : item.isBestSeller)
  })
  if (suggestions.length) return suggestions.slice(0, 4)
  return allMenuItems.filter((item) => item.isBestSeller && !cartNames.includes((item.name || '').toLowerCase())).slice(0, 4)
}

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', emoji: '🌅' }
  if (hour < 17) return { text: 'Good afternoon', emoji: '☀️' }
  if (hour < 21) return { text: 'Good evening', emoji: '🌆' }
  return { text: 'Good night', emoji: '🌙' }
}

const FloatingParticle = ({ delay, x, y, emoji }) => (
  <div
    className="absolute pointer-events-none select-none animate-float opacity-30"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${3 + Math.random() * 2}s`,
      fontSize: `${1 + Math.random() * 0.5}rem`,
    }}
  >
    {emoji}
  </div>
)

const KitchenCard = ({ kitchen, onClick, index }) => {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.1 }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`group relative bg-white dark:bg-[#1a1108] rounded-3xl overflow-hidden border border-amber-100 dark:border-amber-900/40 cursor-pointer transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-2xl hover:shadow-amber-400/20 hover:-translate-y-2`}
      style={{ transitionDelay: `${index * 0.08}s` }}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/30">
        {kitchen.coverImage ? (
          <img src={kitchen.coverImage} alt={kitchen.name} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-7xl animate-pulse-soft">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-3 left-3">
          {kitchen.isOpen ? (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg animate-pulse-subtle">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              OPEN
            </span>
          ) : (
            <span className="bg-gray-800/90 backdrop-blur-sm text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg">CLOSED</span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex items-end gap-2">
          <div className="w-12 h-12 rounded-xl border-2 border-white shadow-lg bg-white overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            {kitchen.logoImage ? <img src={kitchen.logoImage} alt="" className="w-full h-full object-contain p-1" /> : <span className="text-lg">🏠</span>}
          </div>
          <div className="transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <p className="font-display font-bold text-white text-sm drop-shadow-lg">View Menu →</p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3 text-xs font-body mb-3 flex-wrap">
          {kitchen.deliveryRadius && (
            <>
              <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                <span>📍</span> {kitchen.deliveryRadius} km
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
            </>
          )}
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span>⏱️</span> {kitchen.estimatedDeliveryTime || 30} min
          </span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span>🚚</span> {formatCurrency(kitchen.deliveryFee)}
          </span>
        </div>
        <p className="font-display font-bold text-lg text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
          {kitchen.name}
        </p>
        <p className="font-body text-xs text-gray-500 dark:text-gray-400 mt-1">{kitchen.cuisineType || 'Home Kitchen'}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-100 dark:border-amber-900/40">
          <span className="text-xs font-body text-gray-500 dark:text-gray-400">Min. {formatCurrency(kitchen.minOrderAmount)}</span>
          <span className="text-xs font-body font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">Explore →</span>
        </div>
      </div>
    </div>
  )
}

const MenuItemCard = ({ item, onClick }) => (
  <div
    onClick={onClick}
    className="group bg-white dark:bg-[#1a1108] rounded-2xl overflow-hidden border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
  >
    <div className="h-28 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 overflow-hidden relative flex items-center justify-center">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <span className="text-4xl group-hover:scale-125 transition-transform duration-300">{item.isVeg ? '🥬' : '🍖'}</span>
      )}
      <span className={`absolute top-2 left-2 w-4 h-4 border-2 rounded-sm flex items-center justify-center ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
      </span>
      {item.isBestSeller && (
        <span className="absolute top-2 right-2 text-[9px] font-bold bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 px-2 py-0.5 rounded-full shadow-sm animate-pulse-subtle">
          ⭐ BEST
        </span>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div className="p-3.5">
      <p className="font-display font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{item.name}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="font-body font-bold text-amber-600 dark:text-amber-400 text-sm">{formatCurrency(item.price)}</span>
        <span className="text-[10px] font-body font-bold px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
          + Add
        </span>
      </div>
    </div>
  </div>
)

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-[#1a1108] rounded-3xl overflow-hidden border border-amber-100 dark:border-amber-900/40">
        <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 animate-pulse" />
        <div className="p-5 space-y-3">
          <div className="h-4 bg-amber-100 dark:bg-amber-900/20 rounded-full w-3/4 animate-pulse" />
          <div className="h-3 bg-amber-50 dark:bg-amber-900/10 rounded-full w-1/2 animate-pulse" />
          <div className="h-3 bg-amber-50 dark:bg-amber-900/10 rounded-full w-2/3 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
)

export default function CustomerHome() {
  const { user } = useAuth()
  const { cart, cartCount } = useCart()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const greeting = getGreeting()
  const [kitchens, setKitchens] = useState([])
  const [allMenuItems, setAllMenuItems] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [searchResults, setSearchResults] = useState(null)
  const [cuisineFilter, setCuisineFilter] = useState('All')
  const [slideIndex, setSlideIndex] = useState(0)
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const searchTimeout = useRef(null)
  const heroRef = useRef(null)

  useEffect(() => {
    setHeroLoaded(true)
    loadDefaultAddress()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setSlideIndex((prev) => (prev + 1) % CUISINE_SLIDES.length), 5000)
    return () => clearInterval(timer)
  }, [])

  const loadDefaultAddress = async () => {
    try {
      const { data } = await customerAPI.getDefaultAddress()
      if (data) {
        setSelectedAddress(data)
        setUserLocation({ lat: data.latitude, lng: data.longitude })
      } else {
        setShowAddressModal(true)
      }
    } catch {
      setShowAddressModal(true)
    }
  }

  useEffect(() => {
    fetchKitchens()
  }, [userLocation])

  const fetchKitchens = async () => {
    setLoading(true)
    try {
      const response = await customerAPI.getKitchens(userLocation?.lat, userLocation?.lng)
      setKitchens(response.data)
      const menus = await Promise.all(
        response.data.slice(0, 6).map((kitchen) =>
          customerAPI.getMenu(kitchen.id)
            .then((menu) => menu.data.map((item) => ({ ...item, kitchenId: kitchen.id })))
            .catch(() => [])
        )
      )
      setAllMenuItems(menus.flat())
    } catch (err) {
      console.error('Failed to fetch kitchens:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSelect = (address) => {
    setSelectedAddress(address)
    setUserLocation({ lat: address.latitude, lng: address.longitude })
  }

  useEffect(() => { setRecommendations(getRecommendations(cart, allMenuItems)) }, [cart, allMenuItems])
  useEffect(() => { setSearch(searchParams.get('q') || '') }, [searchParams])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    if (!search.trim()) { setSearchResults(null); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data } = await customerAPI.searchKitchens(search)
        setSearchResults(data)
      } catch { setSearchResults([]) }
    }, 300)
  }, [search])

  const displayed = searchResults ?? (cuisineFilter === 'All' ? kitchens : kitchens.filter((k) => k.cuisineType?.toLowerCase().includes(cuisineFilter.toLowerCase())))
  const slide = CUISINE_SLIDES[slideIndex]

  const particles = ['🌶️', '🍛', '⭐', '🌿', '🍋', '✨'].map((emoji, i) => ({ emoji, x: (i * 17) % 95, y: (i * 23) % 80, delay: i * 0.5 }))

  return (
    <div className="min-h-screen bg-[#fdf8f0] dark:bg-[#0f0a05] transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-12">
        {/* Hero Section */}
        <div ref={heroRef} className={`relative transition-all duration-1000 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-orange-200/20 rounded-full blur-3xl animate-pulse-soft" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-orange-200/20 to-amber-200/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
            {particles.map((p, i) => <FloatingParticle key={i} {...p} />)}
          </div>
          <div className="relative z-10 py-8 md:py-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl animate-bounce-soft">{greeting.emoji}</span>
              <span className="font-hand text-2xl text-amber-600 dark:text-amber-400 animate-fade-in">
                {greeting.text}, {user?.name?.split(' ')[0]}!
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              What's cooking <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">today</span>?
              <span className="inline-block ml-2 text-4xl md:text-5xl animate-wave">👨‍🍳</span>
            </h1>
            <button
              onClick={() => setShowAddressModal(true)}
              className="mt-4 flex items-center gap-3 px-4 py-2 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-xl border border-amber-200 dark:border-amber-800 hover:bg-white dark:hover:bg-black/50 transition-all group"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-body text-gray-600 dark:text-gray-300">
                {selectedAddress ? (
                  <>📍 {selectedAddress.fullAddress.split(',')[0]} <span className="text-gray-400">•</span> <span className="text-amber-600 dark:text-amber-400 group-hover:underline">Change</span></>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">📍 Select delivery location</span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Cuisine Carousel */}
        <div className="relative overflow-hidden rounded-3xl group">
          <div
            key={slideIndex}
            style={{ animation: 'slideIn 0.5s cubic-bezier(0.22,1,0.36,1)' }}
            className={`relative h-56 md:h-72 bg-gradient-to-br ${slide.bg} border border-amber-200 dark:border-amber-800 rounded-3xl overflow-hidden transition-all duration-500`}
          >
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 animate-spin-slow" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            <div className="relative z-10 h-full flex items-center px-8 md:px-16 gap-8">
              <div className="flex-1 min-w-0">
                <span className={`inline-block font-body font-bold text-xs px-4 py-1.5 rounded-full bg-gradient-to-r ${slide.color} text-white mb-4 shadow-lg animate-bounce-soft`}>
                  {slide.emoji} {slide.label}
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">{slide.desc}</h2>
                <div className="flex flex-wrap gap-2 mb-5">
                  {slide.dishes.map((dish, i) => (
                    <span key={dish} className="font-body text-xs bg-white/70 dark:bg-white/10 backdrop-blur-sm text-gray-700 dark:text-gray-300 px-4 py-1.5 rounded-full animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                      {dish}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => navigate(`/browse?category=${slide.label}`)}
                  className={`font-body font-bold text-sm px-6 py-3 rounded-xl bg-gradient-to-r ${slide.color} text-white hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg`}
                >
                  Explore {slide.label} →
                </button>
              </div>
              <div className="text-8xl md:text-9xl flex-shrink-0 animate-float" style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.1))' }}>{slide.emoji}</div>
            </div>
          </div>
          <button
            onClick={() => setSlideIndex((prev) => (prev - 1 + CUISINE_SLIDES.length) % CUISINE_SLIDES.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-sm shadow-xl flex items-center justify-center text-gray-700 dark:text-gray-300 hover:scale-110 hover:bg-white transition-all duration-300 z-20 opacity-0 group-hover:opacity-100"
          >
            ‹
          </button>
          <button
            onClick={() => setSlideIndex((prev) => (prev + 1) % CUISINE_SLIDES.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-sm shadow-xl flex items-center justify-center text-gray-700 dark:text-gray-300 hover:scale-110 hover:bg-white transition-all duration-300 z-20 opacity-0 group-hover:opacity-100"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {CUISINE_SLIDES.map((_, index) => (
              <button key={index} onClick={() => setSlideIndex(index)} className={`h-2 rounded-full transition-all duration-500 ${index === slideIndex ? 'w-8 bg-gradient-to-r from-amber-500 to-orange-500' : 'w-2 bg-amber-300/50 hover:bg-amber-400/70'}`} />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg">✨</div>
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Recommended for you</h2>
                <p className="font-body text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  {cart?.items?.length ? "Based on what's in your cart" : 'Popular dishes right now'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendations.map((item, i) => (
                <div key={item.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <MenuItemCard item={item} onClick={() => navigate(`/kitchen-menu/${item.kitchen?.id || item.kitchenId}`)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kitchen Filter */}
        <div className="space-y-6">
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {[{ key: 'All', icon: '🏪' }, { key: 'Breakfast', icon: '🌅' }, { key: 'Starters', icon: '🌶️' }, { key: 'Main Course', icon: '🍛' }, { key: 'Desserts', icon: '🍮' }].map(({ key, icon }) => (
              <button
                key={key}
                onClick={() => {
                  if (key !== 'All') { navigate(`/browse?category=${key}`); return }
                  setCuisineFilter(key)
                  setSearch('')
                  setSearchResults(null)
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-body font-bold text-sm whitespace-nowrap flex-shrink-0 transition-all duration-300 ${
                  cuisineFilter === key
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/30 scale-105'
                    : 'bg-white dark:bg-[#1a1108] text-gray-600 dark:text-gray-400 border border-amber-100 dark:border-amber-900/60 hover:border-amber-300 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                <span>{icon}</span>
                <span>{key}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {searchResults ? (
                <>Search results for "<span className="text-amber-600">{search}</span>"</>
              ) : cuisineFilter === 'All' ? (
                <>All Cloud Kitchens <span className="text-2xl">🏪</span></>
              ) : (
                <>{cuisineFilter} Kitchens</>
              )}
            </h2>
            <span className="font-body text-sm text-amber-600 dark:text-amber-400 font-semibold bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
              {displayed.length} {displayed.length === 1 ? 'kitchen' : 'kitchens'}
            </span>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : displayed.length === 0 ? (
            <div className="text-center py-24 animate-fade-in">
              <div className="text-8xl mb-6 animate-bounce-soft">🔍</div>
              <p className="font-display text-3xl font-bold text-gray-700 dark:text-gray-300 mb-2">No kitchens found</p>
              <p className="font-body text-gray-500 dark:text-gray-400 mb-6">Try a different cuisine or search term</p>
              <button
                onClick={() => { setCuisineFilter('All'); setSearch(''); setSearchResults(null) }}
                className="font-body font-bold text-sm px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Show All Kitchens
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map((kitchen, index) => (
                <KitchenCard key={kitchen.id} kitchen={kitchen} index={index} onClick={() => navigate(`/kitchen-menu/${kitchen.id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Why CloudBite - Our Story */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30 rounded-3xl p-8 md:p-12 border border-amber-200 dark:border-amber-800/40">
          <div className="text-center mb-10">
            <span className="inline-block font-body text-sm text-amber-600 dark:text-amber-400 mb-2 px-4 py-1 bg-amber-100 dark:bg-amber-900/40 rounded-full">Our Story</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Why CloudBite Exists</h2>
            <p className="font-body text-gray-500 dark:text-gray-400 mt-3 max-w-2xl mx-auto">The problems we saw in the food delivery industry that led us to build something different</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '👁️', title: 'Lack of Visibility', desc: 'Cloud kitchens struggle to get noticed on big food platforms where restaurants with big marketing budgets dominate. Their authentic home-cooked food stays hidden.' },
              { icon: '💸', title: 'High Commission Fees', desc: 'Traditional food delivery platforms charge 20-30% commission, eating into the already thin margins of home kitchens. We believe in fair pricing.' },
              { icon: '🍽️', title: 'No Dedicated Platform', desc: 'Existing platforms cater to restaurants. Cloud kitchens get lost among thousands of dining options. CloudBite is built exclusively for home kitchens.' },
            ].map((item, i) => (
              <div key={i} className="bg-white/80 dark:bg-[#1a1108]/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 dark:border-amber-800/40 hover:shadow-lg transition-all duration-300 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
                  {item.icon}
                </div>
                <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white mb-3">{item.title}</h3>
                <p className="font-body text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="font-body text-gray-600 dark:text-gray-300 italic">
              "We built CloudBite to give home cooks a fighting chance — a platform where authentic recipes and passionate cooking are what gets you noticed, not your marketing budget."
            </p>
          </div>
        </div>

        {/* Simple Footer */}
        <div className="mt-16 pt-8 border-t border-amber-200 dark:border-amber-800/40 text-center">
          <a
            href="https://cloudbite-ui.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors hover:underline"
          >
            About Us
          </a>
          <p className="font-body text-xs text-gray-400 mt-3">© 2024 CloudBite. Made with ❤️ in Maharashtra, India.</p>
        </div>

        {/* CTA Banner */}
        <div className="relative rounded-3xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 animate-gradient-x" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute -right-10 -bottom-10 text-[180px] opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">🏠</div>
          <div className="relative z-10 p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-hand text-amber-200 text-xl mb-2">आपल्या घरचं जेवण 🏠</p>
              <h3 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Real Home Food, Real Love</h3>
              <p className="font-body text-white/80 text-sm max-w-lg">Every kitchen on CloudBite is run by a passionate home cook — no dine-in, just authentic Maharashtra flavours.</p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-3 bg-white text-amber-600 font-body font-bold px-8 py-4 rounded-2xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap"
            >
              <span>Track My Orders</span>
              <span className="text-xl">📋</span>
            </button>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelect={handleAddressSelect}
        currentAddress={selectedAddress?.fullAddress}
      />

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4 pointer-events-none animate-slide-up">
          <button
            onClick={() => navigate('/cart')}
            className="pointer-events-auto flex items-center gap-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-8 py-4 rounded-2xl shadow-2xl shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse-subtle"
          >
            <span className="relative">
              🛒
              <span className="absolute -top-2 -right-3 w-5 h-5 bg-white text-amber-600 text-xs font-bold rounded-full flex items-center justify-center">{cartCount}</span>
            </span>
            <span>View Cart</span>
            <span className="w-px h-6 bg-white/30" />
            <span>→</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce-soft { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } }
        @keyframes pulse-soft { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
        @keyframes pulse-subtle { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes wave { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(20deg); } 75% { transform: rotate(-20deg); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes gradient-x { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
        .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
        .animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
        .animate-wave { animation: wave 1s ease-in-out infinite; display: inline-block; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 8s ease infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
