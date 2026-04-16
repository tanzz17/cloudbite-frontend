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
  const [activeSubCategory, setActiveSubCategory] = useState('All')
  const [subCategories, setSubCategories] = useState({})
  const [vegOnly, setVegOnly] = useState(false)
  const [addingId,    setAddingId]    = useState(null)
  const [addedIds,    setAddedIds]    = useState(new Set())
  const [addons,      setAddons]      = useState([])
  const [showAddons,  setShowAddons]  = useState(false)
  const categoryRefs  = useRef({})
  const navRef        = useRef(null)

  useEffect(() => {
    Promise.all([customerAPI.getKitchen(kitchenId), customerAPI.getMenu(kitchenId)])
      .then(([k, m]) => { 
        setKitchen(k.data); 
        setMenuItems(m.data);
        
        // Extract subCategories from menu items by category
        const subCatMap = {};
        m.data.forEach(item => {
          if (item.category && item.subCategory) {
            if (!subCatMap[item.category]) {
              subCatMap[item.category] = new Set();
            }
            subCatMap[item.category].add(item.subCategory);
          }
        });
        // Convert Sets to arrays
        Object.keys(subCatMap).forEach(cat => {
          subCatMap[cat] = ['All', ...Array.from(subCatMap[cat])];
        });
        setSubCategories(subCatMap);
      })
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
    const matchSubCat = activeSubCategory === 'All' || item.subCategory === activeSubCategory
    return matchCat && matchSubCat && (!vegOnly || item.isVeg) && item.isAvailable
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

  const handleRemove = async (item) => {
    setAddingId(item.id)
    try {
      await addToCart(item.id, -1)
    } catch { toast.error('Failed to remove') }
    finally { setAddingId(null) }
  }

  const scrollToCategory = (cat) => {
    setActiveCategory(cat)
    setActiveSubCategory('All')
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
      <div className="relative h-48 md:h-56 overflow-hidden rounded-b-3xl shadow-2xl">
        {kitchen?.coverImage
          ? <img src={kitchen.coverImage} alt={kitchen.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500">
              <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)'}} />
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-6xl animate-float-1">🍛</div>
              <div className="absolute top-10 right-16 text-4xl animate-float-2">🍜</div>
              <div className="absolute top-16 left-12 text-3xl animate-float-3">🥘</div>
            </div>}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        
        {/* Decorative overlay pattern */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'}} />
        
        {/* Kitchen name badge */}
        <div className="absolute top-4 left-4">
          <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">
            <span className="text-white/90 text-xs font-medium">🍳 {kitchen?.cuisineType}</span>
          </div>
        </div>
        
        {/* Cart button */}
        {cartCount > 0 && (
          <button onClick={() => navigate('/cart')}
            className="absolute top-4 right-4 bg-white text-amber-600 font-body font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 hover:scale-105 hover:shadow-2xl transition-all">
            🛒 <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{cartCount}</span>
          </button>
        )}
        
        {/* Kitchen info card */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 border-3 border-white shadow-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {kitchen?.logoImage ? <img src={kitchen.logoImage} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">🏠</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl md:text-2xl font-bold text-gray-900 truncate">{kitchen?.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">⏱️ {kitchen?.estimatedDeliveryTime||30} min</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span className="flex items-center gap-1">🚚 {formatCurrency(kitchen?.deliveryFee)}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span className="flex items-center gap-1">₹{kitchen?.minOrderAmount} min</span>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${kitchen?.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {kitchen?.isOpen ? 'Open' : 'Closed'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kitchen meta bar - simplified */}
      <div className="px-4 py-3 bg-white dark:bg-[#1a1108] border-b border-amber-100 dark:border-amber-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm font-body">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">⏱️</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">{kitchen?.estimatedDeliveryTime||30} <span className="font-normal text-gray-500">min</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🚚</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(kitchen?.deliveryFee)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-body text-gray-500">Veg Only</span>
            <button onClick={() => setVegOnly(v => !v)}
              className={`relative w-11 h-5.5 rounded-full transition-all duration-300 ${vegOnly ? 'bg-green-500 shadow-lg shadow-green-400/50' : 'bg-gray-200 dark:bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform duration-300 ${vegOnly ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
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
      <div ref={navRef} className="sticky top-14 z-20 bg-[#fdf8f0]/95 dark:bg-[#0f0a05]/95 backdrop-blur-md border-b border-amber-100 dark:border-amber-900/40 px-4 py-3">
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat, idx) => (
            <button key={cat} onClick={() => scrollToCategory(cat)}
              className={`px-5 py-2 rounded-xl text-sm font-body font-bold whitespace-nowrap flex-shrink-0 transition-all duration-300 hover:scale-105 ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-400/40'
                  : 'bg-white dark:bg-[#1a1108] text-gray-600 dark:text-gray-400 border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 hover:shadow-md'
              }`}>
              {cat}
            </button>
          ))}
        </div>
        
        {/* Sub-category filter */}
        {activeCategory !== 'All' && subCategories[activeCategory] && subCategories[activeCategory].length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
            {subCategories[activeCategory].map(sub => (
              <button key={sub} onClick={() => setActiveSubCategory(sub)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                  activeSubCategory === sub
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── MENU ITEMS GROUPED BY CATEGORY ──────────────── */}
      <div className="px-4 pt-5 space-y-8">
        {categories.filter(c => c !== 'All').map(cat => {
          const catItems = menuItems.filter(i => i.category === cat && i.isAvailable && (!vegOnly || i.isVeg))
          if (!catItems.length) return null
          return (
            <div key={cat} ref={el => categoryRefs.current[cat] = el} className="animate-fade-in">
              <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
                <span>{cat}</span>
                <span className="font-body text-xs text-gray-400 font-normal bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">{catItems.length} items</span>
              </h2>
              <div className="space-y-4">
                {catItems.map(item => {
                  const isAdded   = addedIds.has(item.id)
                  const inCart    = cart?.items?.find(i => i.menuItem?.id === item.id)
                  const cartQty   = inCart?.quantity || 0
                  return (
                    <div key={item.id}
                      className={`group flex items-start gap-4 p-4 bg-white dark:bg-[#1a1108] rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20 ${
                        isAdded ? 'border-amber-400 shadow-lg shadow-amber-400/20' : 'border-amber-100 dark:border-amber-900/40 hover:border-amber-300'
                      }`}>
                      <div className="flex-1 min-w-0">
                        {/* Veg dot */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center flex-shrink-0 ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                          </span>
                          {item.subCategory && item.subCategory !== 'General' && (
                            <span className="text-[9px] font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">{item.subCategory}</span>
                          )}
                          {item.isBestSeller && (
                            <span className="text-[10px] font-bold text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full animate-pulse">⭐ Bestseller</span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-gray-900 dark:text-white text-lg mb-1 group-hover:text-amber-600 transition-colors">{item.name}</h3>
                        <p className="font-body font-bold text-amber-600 dark:text-amber-400 text-base mb-1">{formatCurrency(item.price)}</p>
                        {item.description && <p className="text-xs font-body text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>}
                        {item.preparationTime && <p className="text-[11px] font-body text-gray-400 mt-1.5 flex items-center gap-1">⏱️ {item.preparationTime} min prep</p>}
                      </div>

                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        {item.imageUrl && (
                          <div className="w-24 h-22 rounded-2xl overflow-hidden relative shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                        {cartQty > 0 ? (
                          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl px-1.5 py-1 shadow-lg">
                            <button onClick={() => handleRemove(item)} disabled={addingId === item.id}
                              className="w-7 h-7 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">−</button>
                            <span className="font-body font-bold text-white text-sm w-6 text-center">{cartQty}</span>
                            <button onClick={() => handleAdd(item)} disabled={addingId === item.id || !kitchen?.isOpen}
                              className="w-7 h-7 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAdd(item)}
                            disabled={addingId === item.id || !kitchen?.isOpen}
                            className={`font-body font-bold text-sm px-5 py-2 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                              isAdded
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                : kitchen?.isOpen
                                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-white hover:border-transparent shadow-md'
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
