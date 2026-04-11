import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Same recommendation engine tied to cart items ────────────────────────────
const ADDON_RULES = [
  { triggers:['butter chicken','chicken curry','dal makhani','paneer','tikka masala'], suggests:['naan','roti','paratha','bread','rice','jeera rice'] },
  { triggers:['naan','roti','paratha','chapati'],               suggests:['butter chicken','dal','paneer','curry','rajma','chole'] },
  { triggers:['biryani','pulao','fried rice','rice'],           suggests:['raita','papad','lassi','dal','shorba'] },
  { triggers:['vada pav','pav bhaji','pav'],                    suggests:['chai','lassi','cold drink','juice'] },
  { triggers:['misal','poha','upma','sabudana'],                suggests:['chai','coffee','juice','lassi'] },
  { triggers:['kebab','tikka','starter','tandoor'],             suggests:['raita','naan','lassi','cold drink'] },
  { triggers:['dal','sabji','sabzi'],                           suggests:['roti','rice','naan','paratha'] },
  { triggers:['curry','gravy','masala'],                        suggests:['dessert','shrikhand','modak','kheer'] },
]

const getAddons = (cartItems, allItems) => {
  if (!cartItems?.length || !allItems?.length) return []
  const cartText = cartItems.map(i => `${i.menuItem?.name||''} ${i.menuItem?.category||''}`).join(' ').toLowerCase()
  const cartIds  = new Set(cartItems.map(i => i.menuItem?.id))
  let kws = []
  ADDON_RULES.forEach(r => { if (r.triggers.some(t => cartText.includes(t))) kws.push(...r.suggests) })
  const scored = allItems
    .filter(m => !cartIds.has(m.id) && m.isAvailable)
    .map(m => ({ ...m, score: kws.filter(k => `${m.name} ${m.category} ${m.description||''}`.toLowerCase().includes(k)).length }))
    .filter(m => m.score > 0).sort((a,b) => b.score - a.score)
  return scored.length ? scored.slice(0,4) : allItems.filter(m=>m.isBestSeller&&!cartIds.has(m.id)).slice(0,4)
}

export default function KitchenMenuPage() {
  const { kitchenId } = useParams()
  const navigate       = useNavigate()
  const { addToCart, cart, cartCount, fetchCart } = useCart()

  const [kitchen,     setKitchen]     = useState(null)
  const [menuItems,   setMenuItems]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [vegOnly,     setVegOnly]     = useState(false)
  const [addingId,    setAddingId]    = useState(null)
  const [addedIds,    setAddedIds]    = useState(new Set())
  const [addons,      setAddons]      = useState([])
  const [showAddons,  setShowAddons]  = useState(false)
  const categoryRefs  = useRef({})
  const navRef        = useRef(null)

  useEffect(() => {
    Promise.all([customerAPI.getKitchen(kitchenId), customerAPI.getMenu(kitchenId)])
      .then(([k, m]) => { setKitchen(k.data); setMenuItems(m.data) })
      .catch(() => toast.error('Failed to load kitchen'))
      .finally(() => setLoading(false))
  }, [kitchenId])

  // Update add-on suggestions when cart changes
  useEffect(() => {
    if (cart?.items?.length && menuItems.length) {
      const suggestions = getAddons(cart.items, menuItems)
      setAddons(suggestions)
      if (suggestions.length && cart.items.length >= 1) setShowAddons(true)
    } else { setAddons([]); setShowAddons(false) }
  }, [cart, menuItems])

  const categories = ['All', ...new Set(menuItems.map(i => i.category).filter(Boolean))]
  const displayed  = menuItems.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory
    return matchCat && (!vegOnly || item.isVeg) && item.isAvailable
  })

  const handleAdd = async (item) => {
    if (cart?.kitchen && cart.kitchen.id !== Number(kitchenId) && cart.items?.length > 0) {
      if (!window.confirm('Your cart has items from another kitchen. Clear and add this item?')) return
    }
    setAddingId(item.id)
    try {
      await addToCart(item.id, 1)
      setAddedIds(prev => new Set([...prev, item.id]))
      toast.success(`${item.name} added! 🛒`, { duration: 1500 })
      setTimeout(() => setAddedIds(prev => { const n = new Set(prev); n.delete(item.id); return n }), 2000)
    } catch { toast.error('Failed to add') }
    finally { setAddingId(null) }
  }

  const scrollToCategory = (cat) => {
    setActiveCategory(cat)
    const el = categoryRefs.current[cat]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center"><div className="text-6xl mb-4 animate-bounce-soft">🍽️</div><p className="font-hand text-amber-600 text-2xl">Loading menu...</p></div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* ── Cover + kitchen info ───────────────────────── */}
      <div className="relative h-52 md:h-64 overflow-hidden rounded-b-3xl">
        {kitchen?.coverImage
          ? <img src={kitchen.coverImage} alt={kitchen.name} className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-700" />
          : <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-8xl">🍽️</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Cart button */}
        {cartCount > 0 && (
          <button onClick={() => navigate('/cart')}
            className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2 hover:scale-105 transition-all">
            🛒 {cartCount} items
          </button>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white border-2 border-white shadow-xl overflow-hidden flex items-center justify-center flex-shrink-0">
              {kitchen?.logoImage ? <img src={kitchen.logoImage} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">🏠</span>}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{kitchen?.name}</h1>
              <p className="text-white/70 text-sm font-body">{kitchen?.cuisineType}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kitchen meta bar */}
      <div className="px-4 py-3 bg-white dark:bg-[#1a1108] border-b border-amber-100 dark:border-amber-900/40 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 text-sm font-body flex-wrap">
          <span className="font-bold text-yellow-500">⭐ {kitchen?.rating?.toFixed(1) || 'New'}</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">⏱️ {kitchen?.estimatedDeliveryTime||30} min</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">🚚 {formatCurrency(kitchen?.deliveryFee)}</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">Min. {formatCurrency(kitchen?.minOrderAmount)}</span>
          <span className={`font-bold ${kitchen?.isOpen ? 'text-green-600' : 'text-red-500'}`}>
            {kitchen?.isOpen ? '🟢 Open' : '🔴 Closed'}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-body text-gray-600 dark:text-gray-400">Veg only</span>
          <button onClick={() => setVegOnly(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${vegOnly ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${vegOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* ── SMART ADD-ON BANNER ─────────────────────────── */}
      {showAddons && addons.length > 0 && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 animate-slide-down">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-display font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">✨ Pair it with something?</p>
              <p className="text-xs font-body text-amber-600 dark:text-amber-400">Based on what's in your cart</p>
            </div>
            <button onClick={() => setShowAddons(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {addons.map(item => (
              <div key={item.id} className="flex-shrink-0 w-32 bg-white dark:bg-[#1a1108] rounded-xl overflow-hidden border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 transition-all">
                <div className="h-20 bg-amber-50 dark:bg-amber-900/20 relative overflow-hidden">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">{item.isVeg ? '🥬' : '🍖'}</div>}
                </div>
                <div className="p-2">
                  <p className="font-body font-bold text-[11px] text-gray-900 dark:text-white truncate">{item.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-bold text-amber-600">{formatCurrency(item.price)}</span>
                    <button onClick={() => handleAdd(item)} disabled={addingId === item.id || !kitchen?.isOpen}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
                      {addingId === item.id ? '...' : '+ Add'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STICKY CATEGORY NAV ─────────────────────────── */}
      <div ref={navRef} className="sticky top-14 z-20 bg-[#fdf8f0]/95 dark:bg-[#0f0a05]/95 backdrop-blur-sm border-b border-amber-100 dark:border-amber-900/40 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button key={cat} onClick={() => scrollToCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-body font-bold whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-400/30'
                  : 'bg-white dark:bg-[#1a1108] text-gray-600 dark:text-gray-400 border border-amber-100 dark:border-amber-900/40 hover:border-amber-300'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── MENU ITEMS GROUPED BY CATEGORY ──────────────── */}
      <div className="px-4 pt-4 space-y-6">
        {categories.filter(c => c !== 'All').map(cat => {
          const catItems = menuItems.filter(i => i.category === cat && i.isAvailable && (!vegOnly || i.isVeg))
          if (!catItems.length) return null
          return (
            <div key={cat} ref={el => categoryRefs.current[cat] = el}>
              <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
                {cat}
                <span className="font-body text-xs text-gray-400 font-normal">({catItems.length})</span>
              </h2>
              <div className="space-y-3">
                {catItems.map(item => {
                  const isAdded   = addedIds.has(item.id)
                  const inCart    = cart?.items?.find(i => i.menuItem?.id === item.id)
                  const cartQty   = inCart?.quantity || 0
                  return (
                    <div key={item.id}
                      className={`group flex items-start gap-4 p-4 bg-white dark:bg-[#1a1108] rounded-2xl border transition-all duration-300 ${
                        isAdded ? 'border-amber-400 shadow-md shadow-amber-400/20 scale-[1.01]' : 'border-amber-100 dark:border-amber-900/40 hover:border-amber-300 hover:shadow-md'
                      }`}>
                      <div className="flex-1 min-w-0">
                        {/* Veg dot */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center flex-shrink-0 ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                          </span>
                          {item.isBestSeller && (
                            <span className="text-[10px] font-bold text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded-md">⭐ BESTSELLER</span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-0.5">{item.name}</h3>
                        <p className="font-body font-bold text-amber-600 dark:text-amber-400 mb-1">{formatCurrency(item.price)}</p>
                        {item.description && <p className="text-xs font-body text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>}
                        {item.preparationTime && <p className="text-[11px] font-body text-gray-400 mt-1">⏱️ {item.preparationTime} min prep</p>}
                      </div>

                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        {item.imageUrl && (
                          <div className="w-24 h-20 rounded-xl overflow-hidden relative">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-400" onError={e => e.target.style.display='none'} />
                          </div>
                        )}
                        {cartQty > 0 ? (
                          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl px-1 py-0.5">
                            <button onClick={() => handleAdd(item)} disabled={addingId === item.id}
                              className="w-6 h-6 text-white font-bold text-sm flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">−</button>
                            <span className="font-body font-bold text-white text-sm w-5 text-center">{cartQty}</span>
                            <button onClick={() => handleAdd(item)} disabled={addingId === item.id || !kitchen?.isOpen}
                              className="w-6 h-6 text-white font-bold text-sm flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAdd(item)}
                            disabled={addingId === item.id || !kitchen?.isOpen}
                            className={`font-body font-bold text-sm px-4 py-1.5 rounded-xl border-2 transition-all duration-200 ${
                              isAdded
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                : kitchen?.isOpen
                                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-white hover:border-transparent hover:shadow-md'
                                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}>
                            {addingId === item.id ? '...' : isAdded ? '✓ Added' : '+ ADD'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Items not in a category */}
        {(() => {
          const uncategorised = menuItems.filter(i => !i.category && i.isAvailable && (!vegOnly || i.isVeg))
          return uncategorised.length ? (
            <div>
              <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-3">Other Items</h2>
              {uncategorised.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 transition-all mb-2">
                  <div className="flex-1"><p className="font-display font-bold text-gray-900 dark:text-white">{item.name}</p><p className="font-body text-sm text-amber-600">{formatCurrency(item.price)}</p></div>
                  <button onClick={() => handleAdd(item)} disabled={addingId === item.id || !kitchen?.isOpen}
                    className="font-body font-bold text-sm px-4 py-1.5 rounded-xl border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white transition-all">
                    {addingId === item.id ? '...' : '+ ADD'}
                  </button>
                </div>
              ))}
            </div>
          ) : null
        })()}
      </div>

      {/* ── STICKY CART BAR ──────────────────────────────── */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4 pointer-events-none">
          <button onClick={() => navigate('/cart')}
            className="pointer-events-auto flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-8 py-4 rounded-2xl shadow-2xl shadow-amber-400/40 hover:scale-105 active:scale-95 transition-all duration-300">
            <span className="flex items-center gap-2">🛒 {cartCount} item{cartCount !== 1 ? 's' : ''}</span>
            <span className="w-px h-4 bg-white/30" />
            <span>View Cart →</span>
          </button>
        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
    </div>
  )
}
