import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function KitchenMenuPage() {
  const { kitchenId } = useParams()
  const navigate = useNavigate()
  const { addToCart, cartCount, cart } = useCart()
  const [kitchen, setKitchen] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [addingId, setAddingId] = useState(null)
  const [vegOnly, setVegOnly] = useState(false)

  useEffect(() => {
    Promise.all([customerAPI.getKitchen(kitchenId), customerAPI.getMenu(kitchenId)])
      .then(([k, m]) => { setKitchen(k.data); setMenuItems(m.data) })
      .catch(() => toast.error('Failed to load kitchen'))
      .finally(() => setLoading(false))
  }, [kitchenId])

  const categories = ['All', ...new Set(menuItems.map(i => i.category).filter(Boolean))]
  const displayed = menuItems.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory
    const matchVeg = !vegOnly || item.isVeg
    return matchCat && matchVeg && item.isAvailable
  })

  const handleAdd = async (item) => {
    if (cart && cart.kitchen && cart.kitchen.id !== Number(kitchenId) && cart.items?.length > 0) {
      if (!window.confirm('Your cart has items from another kitchen. Clear cart and add this item?')) return
    }
    try {
      setAddingId(item.id)
      await addToCart(item.id, 1)
      toast.success(`${item.name} added to cart! 🛒`)
    } catch { toast.error('Failed to add to cart') }
    finally { setAddingId(null) }
  }

  if (loading) return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-4 animate-bounce-soft">🍽️</div><p className="font-hand text-orange-600 text-xl">Loading menu...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg">
      {/* Cover */}
      <div className="relative h-52 md:h-72">
        {kitchen?.coverImage ? (
          <img src={kitchen.coverImage} alt={kitchen.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-orange-gradient flex items-center justify-center text-8xl">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-white/90 dark:bg-brand-dark-card text-gray-800 dark:text-white rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-md">
          ←
        </button>
        {cartCount > 0 && (
          <button onClick={() => navigate('/cart')} className="absolute top-4 right-4 bg-orange-gradient text-white rounded-2xl px-4 py-2 flex items-center gap-2 shadow-orange">
            <span>🛒</span>
            <span className="font-body font-bold text-sm">{cartCount} items</span>
          </button>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-brand-dark-card border-2 border-white flex items-center justify-center overflow-hidden shadow-lg">
              {kitchen?.logoImage ? <img src={kitchen.logoImage} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">🍽️</span>}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{kitchen?.name}</h1>
              <p className="text-white/80 text-sm font-body">{kitchen?.cuisineType}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kitchen info bar */}
      <div className="bg-white dark:bg-brand-dark-surface border-b border-orange-100 dark:border-brand-dark-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 text-sm font-body">
            <span className="font-bold text-yellow-600">⭐ {kitchen?.rating?.toFixed(1) || 'New'}</span>
            <span className="text-gray-500">⏱️ {kitchen?.estimatedDeliveryTime || 30} min</span>
            <span className="text-gray-500">🚚 {formatCurrency(kitchen?.deliveryFee)}</span>
            <span className="text-gray-500">Min. {formatCurrency(kitchen?.minOrderAmount)}</span>
            <span className={`font-bold ${kitchen?.isOpen ? 'text-green-600' : 'text-red-500'}`}>
              {kitchen?.isOpen ? '🟢 Open' : '🔴 Closed'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-body text-gray-600 dark:text-gray-400">Veg only</span>
            <button onClick={() => setVegOnly(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${vegOnly ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${vegOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-6">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-body font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeCategory === cat ? 'bg-orange-gradient text-white shadow-orange' : 'bg-white dark:bg-brand-dark-card text-gray-600 dark:text-gray-400 border border-orange-100 dark:border-brand-dark-border'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Menu items */}
        <div className="space-y-4">
          {displayed.length === 0 ? (
            <div className="text-center py-12"><div className="text-5xl mb-3">🍽️</div><p className="font-display font-bold text-gray-700 dark:text-gray-300">No items found</p></div>
          ) : displayed.map(item => (
            <div key={item.id} className="card p-4 flex gap-4 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`w-4 h-4 border-2 rounded-sm flex-shrink-0 mt-0.5 ${item.isVeg ? 'border-green-500' : 'border-red-500'} flex items-center justify-center`}>
                    <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-gray-900 dark:text-white">{item.name}</h3>
                    {item.isBestSeller && (
                      <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-lg">⭐ BESTSELLER</span>
                    )}
                  </div>
                </div>
                <p className="font-display font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(item.price)}</p>
                {item.description && (
                  <p className="text-sm font-body text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                )}
                {item.preparationTime && (
                  <p className="text-xs font-body text-gray-400 mt-1">⏱️ {item.preparationTime} min</p>
                )}
              </div>
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-24 h-20 object-cover rounded-xl" onError={e => e.target.style.display='none'} />
                )}
                <button onClick={() => handleAdd(item)} disabled={addingId === item.id || !kitchen?.isOpen}
                  className={`w-full px-4 py-2 rounded-xl font-body font-bold text-sm transition-all ${
                    kitchen?.isOpen
                      ? 'bg-white dark:bg-brand-dark-card border-2 border-orange-500 text-orange-600 hover:bg-orange-gradient hover:text-white hover:border-transparent shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                  }`}>
                  {addingId === item.id ? '...' : '+ ADD'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4">
          <button onClick={() => navigate('/cart')}
            className="btn-primary flex items-center gap-3 py-4 px-8 rounded-2xl shadow-orange-lg text-base">
            <span>🛒 {cartCount} items</span>
            <span className="w-px h-5 bg-white/30" />
            <span>View Cart →</span>
          </button>
        </div>
      )}
    </div>
  )
}
