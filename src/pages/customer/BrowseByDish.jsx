import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { customerAPI, publicAPI } from '../../services/api'
import { formatCurrency } from '../../utils/helpers'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'

const CATEGORY_META = {
  'Breakfast':    { emoji:'🌅', color:'from-yellow-400 to-amber-500',  bg:'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',  desc:'Start your morning with authentic Maharashtra flavours' },
  'Starters':     { emoji:'🌶️', color:'from-red-400 to-rose-500',     bg:'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',          desc:'Fire up your appetite with these delicious starters' },
  'Main Course':  { emoji:'🍛', color:'from-orange-400 to-amber-500', bg:'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',   desc:'The heart of every great Maharashtra meal' },
  'Desserts':     { emoji:'🍮', color:'from-pink-400 to-rose-500',    bg:'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',         desc:'End on a sweet note with traditional sweets' },
}

export default function BrowseByDish() {
  const [searchParams] = useSearchParams()
  const category       = searchParams.get('category') || 'Starters'
  const navigate       = useNavigate()
  const { addToCart, cart, cartCount } = useCart()

  const [dishes,    setDishes]    = useState([])
  const [kitchens,  setKitchens]  = useState({})
  const [loading,   setLoading]   = useState(true)
  const [addingId,  setAddingId]  = useState(null)
  const [sortBy,    setSortBy]    = useState('rating')
  const [vegOnly,   setVegOnly]   = useState(false)
  const [activeTab, setActiveTab] = useState(category)

  const meta = CATEGORY_META[activeTab] || CATEGORY_META['Starters']

  useEffect(() => {
    setLoading(true)
    customerAPI.getKitchens()
      .then(async kRes => {
        const activeKitchens = kRes.data.filter(k => k.isActive && k.isOpen)
        const kitchenMap     = {}
        activeKitchens.forEach(k => { kitchenMap[k.id] = k })
        setKitchens(kitchenMap)

        // Fetch menus from all active kitchens in parallel
        const menus = await Promise.all(
          activeKitchens.map(k =>
            customerAPI.getMenu(k.id)
              .then(m => m.data
                .filter(d => d.category === activeTab && d.isAvailable)
                .map(d => ({ ...d, kitchenId: k.id, kitchenName: k.name, kitchenLogo: k.logoImage, kitchenRating: k.rating }))
              )
              .catch(() => [])
          )
        )
        setDishes(menus.flat())
      })
      .catch(() => toast.error('Failed to load dishes'))
      .finally(() => setLoading(false))
  }, [activeTab])

  const sorted = [...dishes]
    .filter(d => !vegOnly || d.isVeg)
    .sort((a, b) => {
      if (sortBy === 'price-asc')  return (a.price || 0) - (b.price || 0)
      if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0)
      if (sortBy === 'bestseller') {
        const aBest = a.isBestSeller ? 1 : 0
        const bBest = b.isBestSeller ? 1 : 0
        return bBest - aBest
      }
      if (sortBy === 'rating')     return (b.kitchenRating||0) - (a.kitchenRating||0)
      return 0
    })

  const handleAdd = async (dish) => {
    if (cart?.kitchen && cart.kitchen.id !== dish.kitchenId && cart.items?.length > 0) {
      if (!window.confirm('Clear cart from previous kitchen and add this item?')) return
    }
    setAddingId(dish.id)
    try { await addToCart(dish.id, 1); toast.success(`${dish.name} added! 🛒`) }
    catch { toast.error('Failed to add') }
    finally { setAddingId(null) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24">

      {/* ── Category tabs ─────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
        {Object.entries(CATEGORY_META).map(([cat, m]) => (
          <button key={cat} onClick={() => setActiveTab(cat)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-body font-bold text-sm whitespace-nowrap flex-shrink-0 transition-all duration-300 ${
              activeTab === cat
                ? `bg-gradient-to-r ${m.color} text-white shadow-lg scale-105`
                : 'bg-white dark:bg-[#1a1108] text-gray-600 dark:text-gray-400 border border-amber-100 dark:border-amber-900/40 hover:border-amber-300'
            }`}>
            {m.emoji} {cat}
          </button>
        ))}
      </div>

      {/* ── Hero banner ───────────────────────────────── */}
      <div className={`relative rounded-3xl overflow-hidden p-6 mb-6 bg-gradient-to-br ${meta.bg} border border-amber-200 dark:border-amber-800`}>
        <div className="absolute -right-6 -top-6 text-[100px] opacity-10">{meta.emoji}</div>
        <div className="relative z-10">
          <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span>{meta.emoji}</span> {activeTab}
          </h1>
          <p className="font-body text-sm text-gray-600 dark:text-gray-400 mt-1">{meta.desc}</p>
          <p className="font-body text-xs text-amber-600 dark:text-amber-400 mt-2 font-bold">
            {loading ? 'Loading...' : `${sorted.length} dishes from ${Object.keys(kitchens).length} cloud kitchens`}
          </p>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#1a1108] border-2 border-amber-100 dark:border-amber-900/40 font-body text-sm text-gray-700 dark:text-gray-300 focus:border-amber-400 focus:outline-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <option value="rating">⭐ Top Rated</option>
            <option value="bestseller">🔥 Bestsellers</option>
            <option value="price-asc">⬆️ Price: Low to High</option>
            <option value="price-desc">⬇️ Price: High to Low</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        <button onClick={() => setVegOnly(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-body font-bold text-sm border-2 transition-all ${vegOnly ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-md' : 'border-amber-100 dark:border-amber-900/40 text-gray-600 dark:text-gray-400 bg-white dark:bg-[#1a1108]'}`}>
          🟢 Veg Only {vegOnly && '✓'}
        </button>
      </div>

      {/* ── Dish grid ─────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-amber-50 dark:bg-amber-900/10 animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">{meta.emoji}</div>
          <p className="font-display text-xl font-bold text-gray-700 dark:text-gray-300">No {activeTab.toLowerCase()} available right now</p>
          <p className="font-body text-gray-500 mt-2">Check back later or try another category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((dish, i) => (
            <div key={`${dish.id}-${dish.kitchenId}`}
              className="group flex items-start gap-3 p-4 bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              style={{ animationDelay: `${i * 0.05}s` }}>

              {/* Dish image */}
              <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-amber-50 dark:bg-amber-900/20 flex-shrink-0">
                {dish.imageUrl
                  ? <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-400" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl">{dish.isVeg ? '🥬' : '🍖'}</div>}
                {dish.isBestSeller && (
                  <span className="absolute top-1 left-1 text-[9px] font-bold bg-yellow-400 text-yellow-900 px-1 py-0.5 rounded-md">⭐ BEST</span>
                )}
                <span className={`absolute bottom-1 left-1 w-3 h-3 border-2 rounded-sm ${dish.isVeg ? 'border-green-500 bg-green-400' : 'border-red-500 bg-red-400'}`} />
              </div>

              {/* Dish info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-gray-900 dark:text-white truncate">{dish.name}</h3>
                {dish.description && <p className="text-xs font-body text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{dish.description}</p>}
                <p className="font-body font-bold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(dish.price)}</p>

                {/* Kitchen attribution — the key feature */}
                <button
                  onClick={() => navigate(`/kitchen-menu/${dish.kitchenId}`)}
                  className="flex items-center gap-1.5 mt-2 group/k">
                  <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {dish.kitchenLogo ? <img src={dish.kitchenLogo} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px]">🏠</span>}
                  </div>
                  <span className="text-xs font-body text-gray-500 dark:text-gray-400 group-hover/k:text-amber-600 dark:group-hover/k:text-amber-400 transition-colors truncate">
                    {dish.kitchenName}
                  </span>
                  {dish.kitchenRating && <span className="text-[10px] text-yellow-500 flex-shrink-0">⭐{dish.kitchenRating?.toFixed(1)}</span>}
                </button>
              </div>

              {/* Add button */}
              <button
                onClick={() => handleAdd(dish)}
                disabled={addingId === dish.id}
                className="flex-shrink-0 font-body font-bold text-xs px-3 py-1.5 rounded-xl border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-white hover:border-transparent transition-all duration-200 disabled:opacity-50 mt-1">
                {addingId === dish.id ? '...' : '+ ADD'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4 pointer-events-none">
          <button onClick={() => navigate('/cart')}
            className="pointer-events-auto flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-8 py-4 rounded-2xl shadow-2xl shadow-amber-400/40 hover:scale-105 transition-all">
            🛒 {cartCount} items · View Cart →
          </button>
        </div>
      )}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
    </div>
  )
}
