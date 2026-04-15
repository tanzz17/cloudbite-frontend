import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useAddress } from '../../context/AddressContext'
import { customerAPI, paymentAPI, publicAPI } from '../../services/api'
import { formatCurrency } from '../../utils/helpers'
import toast from 'react-hot-toast'
import AddressModal from '../../components/customer/AddressModal'

// ── Smart add-on recommendation rules ───────────────────────────────────────
const ADDON_RULES = [
  { triggers: ['butter chicken','chicken curry','dal makhani','paneer butter masala','tikka masala'], suggests: ['naan','roti','paratha','bread','rice','jeera rice'] },
  { triggers: ['naan','roti','paratha','chapati','puri'],                 suggests: ['butter chicken','dal','paneer','curry','rajma','chole'] },
  { triggers: ['biryani','pulao','fried rice','rice'],                    suggests: ['raita','salan','shorba','papad','lassi','dal'] },
  { triggers: ['vada pav','pav bhaji','sandwich','burger','pav'],        suggests: ['chai','lassi','cold drink','juice','beverage'] },
  { triggers: ['misal','poha','upma','sabudana','thalipeeth'],            suggests: ['chai','coffee','juice','lassi','shrikhand'] },
  { triggers: ['kebab','tikka','starter','fry','tandoor'],               suggests: ['mint chutney','raita','naan','lassi','cold drink'] },
  { triggers: ['dal','sabji','sabzi','vegetable','bhaji'],               suggests: ['roti','rice','naan','paratha','chapati','phulka'] },
  { triggers: ['curry','gravy','masala','korma'],                        suggests: ['dessert','shrikhand','gulab jamun','kheer','modak'] },
  { triggers: ['modak','shrikhand','kheer','basundi','gulab jamun'],     suggests: ['chai','coffee','masala milk'] },
]

const getRecommendations = (cartItems, allMenuItems) => {
  if (!cartItems?.length || !allMenuItems?.length) return []
  const cartText = cartItems.map(i => `${i.menuItem?.name || ''} ${i.menuItem?.category || ''}`).join(' ').toLowerCase()
  const cartIds  = new Set(cartItems.map(i => i.menuItem?.id))
  let keywords   = []
  ADDON_RULES.forEach(r => { if (r.triggers.some(t => cartText.includes(t))) keywords.push(...r.suggests) })
  const scored = allMenuItems
    .filter(m => !cartIds.has(m.id) && m.isAvailable)
    .map(m => ({ ...m, score: keywords.filter(k => `${m.name} ${m.category} ${m.description||''}`.toLowerCase().includes(k)).length }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.length ? scored.slice(0, 3) : allMenuItems.filter(m => m.isBestSeller && !cartIds.has(m.id)).slice(0, 3)
}

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) { resolve(true); return }
  const existing = document.querySelector('script[src*="razorpay.com"]')
  if (existing) {
    setTimeout(() => resolve(!!window.Razorpay), 1000)
    return
  }
  const s = document.createElement('script')
  s.src = 'https://checkout.razorpay.com/v1/checkout.js'
  s.async = true
  s.onload = () => resolve(true)
  s.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
  document.head.appendChild(s)
})

export default function CartPage() {
  const { cart, updateItem, clearCart, fetchCart } = useCart()
  const { user } = useAuth()
  const { selectedAddress, selectAddress, refreshAddresses } = useAddress()
  const navigate  = useNavigate()

  const [paymentMethod,    setPaymentMethod]    = useState('COD')
  const [instructions,     setInstructions]     = useState('')
  const [placing,          setPlacing]          = useState(false)
  const [kitchenMenu,      setKitchenMenu]      = useState([])
  const [recommendations,  setRecommendations]  = useState([])
  const [addingId,         setAddingId]         = useState(null)
  const [isDemoMode,       setIsDemoMode]       = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)

  const handleAddressSelect = (address) => {
    selectAddress(address)
  }

  const items      = cart?.items || []
  const kitchen    = cart?.kitchen
  const subtotal   = items.reduce((s, i) => s + (i.menuItem?.price || 0) * i.quantity, 0)
  const deliveryFee = kitchen?.deliveryFee || 30
  const tax        = subtotal * 0.05
  const total      = subtotal + deliveryFee + tax

  useEffect(() => {
    if (kitchen?.id) customerAPI.getMenu(kitchen.id).then(r => setKitchenMenu(r.data)).catch(() => {})
    publicAPI.getPaymentConfig().then(r => setIsDemoMode(r.data?.demoMode || false)).catch(() => {})
  }, [kitchen?.id])

  useEffect(() => {
    setRecommendations(getRecommendations(items, kitchenMenu))
  }, [items, kitchenMenu])

  const handleQty = async (cartItemId, qty) => {
    try { await updateItem(cartItemId, qty) } catch { toast.error('Failed to update') }
  }

  const handleAddRec = async (menuItemId) => {
    setAddingId(menuItemId)
    try { await customerAPI.addToCart({ menuItemId, quantity: 1, specialInstructions: '' }); await fetchCart(); toast.success('Added! 🛒') }
    catch { toast.error('Could not add') } finally { setAddingId(null) }
  }

  const handleRazorpay = async (orderId) => {
    try {
      const { data } = await paymentAPI.createOrder(orderId)
      console.log('Razorpay order created:', data)
      
      if (data.demoMode) {
        const result = await paymentAPI.completeDemoPayment(orderId)
        if (result.data.paymentStatus === 'COMPLETED') {
          return true
        }
        throw new Error('Demo payment failed')
      }
      
      if (!data.razorpayOrderId) {
        throw new Error('Failed to create Razorpay order. Please try again.')
      }
      
      await loadRazorpay()
      
      return new Promise((resolve, reject) => {
        const options = {
          key: data.keyId,
          amount: Math.round(data.amount * 100),
          currency: data.currency || 'INR',
          name: 'CloudBite',
          description: `Order ${data.orderNumber}`,
          order_id: data.razorpayOrderId,
          prefill: {
            name: user?.name || data.customerName || '',
            email: user?.email || data.customerEmail || '',
            contact: user?.phone || data.customerPhone || ''
          },
          theme: { color: '#f97316' },
          handler: async (response) => {
            console.log('Payment successful:', response)
            try {
              const v = await paymentAPI.verifyPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId,
              })
              if (v.data?.success) {
                resolve(true)
              } else {
                await paymentAPI.markPaymentFailed(orderId, 'Payment verification failed')
                reject(new Error('Payment verification failed'))
              }
            } catch (err) {
              console.error('Verification error:', err)
              await paymentAPI.markPaymentFailed(orderId, 'Payment verification failed')
              reject(new Error('Payment verification failed'))
            }
          },
          modal: {
            ondismiss: async () => {
              console.log('Payment modal dismissed')
              try {
                await paymentAPI.markPaymentFailed(orderId, 'Payment cancelled by user')
              } catch (e) {
                console.error('Failed to mark payment as failed:', e)
              }
              reject(new Error('cancelled'))
            }
          }
        }
        
        const rzp = new window.Razorpay(options)
        
        rzp.on('payment.failed', async (response) => {
          console.log('Payment failed:', response.error)
          try {
            await paymentAPI.markPaymentFailed(orderId, response.error?.description || 'Payment failed')
          } catch (e) {
            console.error('Failed to mark payment as failed:', e)
          }
          reject(new Error(response.error?.description || 'Payment failed'))
        })
        
        rzp.open()
      })
    } catch (err) {
      console.error('Razorpay error:', err)
      throw err
    }
  }

  const handleCheckout = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); setShowAddressModal(true); return }
    setPlacing(true)
    try {
      const { data: order } = await customerAPI.placeOrder({
        kitchenId: kitchen.id,
        items: items.map(i => ({ menuItemId: i.menuItem.id, quantity: i.quantity, specialInstructions: i.specialInstructions || '' })),
        deliveryAddress: selectedAddress.fullAddress,
        deliveryLatitude: selectedAddress.latitude,
        deliveryLongitude: selectedAddress.longitude,
        deliveryInstructions: instructions,
        paymentMethod,
      })
      if (paymentMethod === 'RAZORPAY') {
        try {
          await handleRazorpay(order.id)
          toast.success('🎉 Payment successful! Order placed.')
          await clearCart()
          navigate(`/orders/${order.id}`)
        } catch (e) {
          if (e.message === 'cancelled') {
            toast.error('Payment was cancelled. Your order has not been placed.')
          } else {
            toast.error('Payment failed. Your order has not been placed. Please try again later.')
          }
          await fetchCart()
          navigate('/home')
          return
        }
      } else {
        toast.success('🎉 Order placed! Pay on delivery.')
        await clearCart()
        navigate(`/orders/${order.id}`)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to place order')
      await fetchCart()
    } finally { setPlacing(false) }
  }

  if (!items.length) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
      <div className="text-8xl mb-6 animate-bounce-soft">🛒</div>
      <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
      <p className="font-body text-gray-500 dark:text-gray-400 mb-8">Discover authentic home-cooked Maharashtra meals!</p>
      <button onClick={() => navigate('/home')} className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-8 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all">
        🍽️ Browse Kitchens
      </button>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-10">
      {isDemoMode && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ <strong>Demo Mode:</strong> Payments are simulated. Set <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">DEMO_MODE=false</code> in backend to enable real Razorpay payments.
        </div>
      )}
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">🛒 Your Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Kitchen */}
          {kitchen && (
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                {kitchen.logoImage ? <img src={kitchen.logoImage} alt="" className="w-full h-full object-cover" /> : '🍽️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-gray-900 dark:text-white truncate">{kitchen.name}</p>
                <p className="text-xs font-body text-gray-400">{kitchen.cuisineType} · {kitchen.city}</p>
              </div>
              <button onClick={() => navigate(`/kitchen-menu/${kitchen.id}`)} className="text-xs font-body font-bold text-amber-600 hover:underline flex-shrink-0">+ Add more</button>
            </div>
          )}

          {/* Items */}
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-4 bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 transition-all">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-amber-50 dark:bg-amber-900/20 flex-shrink-0 relative">
                {item.menuItem?.imageUrl ? <img src={item.menuItem.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                <span className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full border ${item.menuItem?.isVeg ? 'border-green-500 bg-green-400' : 'border-red-500 bg-red-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm text-gray-900 dark:text-white truncate">{item.menuItem?.name}</p>
                <p className="font-body text-xs text-amber-600 dark:text-amber-400 font-semibold">{formatCurrency(item.menuItem?.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleQty(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full border-2 border-amber-400 text-amber-600 flex items-center justify-center font-bold hover:bg-amber-50 transition-colors text-sm">−</button>
                <span className="w-5 text-center font-body font-bold text-sm text-gray-900 dark:text-white">{item.quantity}</span>
                <button onClick={() => handleQty(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm hover:shadow-md transition-all">+</button>
              </div>
              <p className="font-body font-bold text-sm text-gray-900 dark:text-white w-14 text-right flex-shrink-0">{formatCurrency((item.menuItem?.price || 0) * item.quantity)}</p>
            </div>
          ))}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
              <p className="font-display font-bold text-sm text-gray-900 dark:text-white mb-1 flex items-center gap-2">✨ Pairs well with your order</p>
              <p className="text-xs font-body text-amber-600 dark:text-amber-400 mb-3">Add-ons recommended from this kitchen</p>
              <div className="grid grid-cols-3 gap-2">
                {recommendations.map(item => (
                  <div key={item.id} className="bg-white dark:bg-[#1a1108] rounded-xl p-2.5 border border-amber-100 dark:border-amber-900/40 hover:border-amber-400 transition-all cursor-pointer group" onClick={() => handleAddRec(item.id)}>
                    <div className="h-14 rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/20 mb-2 flex items-center justify-center">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <span className="text-2xl">{item.isVeg ? '🥬' : '🍖'}</span>}
                    </div>
                    <p className="font-body font-bold text-[11px] text-gray-900 dark:text-white truncate">{item.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-bold text-amber-600">{formatCurrency(item.price)}</span>
                      <button disabled={addingId === item.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white">{addingId === item.id ? '...' : '+ Add'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Address */}
          <div className="p-4 bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">📍 Delivery Address</h3>
              <button
                onClick={() => setShowAddressModal(true)}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                {selectedAddress ? 'Change' : 'Select Location'}
              </button>
            </div>
            {selectedAddress ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{selectedAddress.label === 'Home' ? '🏠' : selectedAddress.label === 'Office' ? '🏢' : '📍'}</span>
                  <span className="font-body font-bold text-sm text-gray-700 dark:text-gray-300">{selectedAddress.label}</span>
                  {selectedAddress.receiverName && (
                    <span className="text-xs text-gray-500">• {selectedAddress.receiverName}</span>
                  )}
                </div>
                <p className="font-body text-sm text-gray-600 dark:text-gray-400">{selectedAddress.fullAddress}</p>
                {selectedAddress.latitude && selectedAddress.longitude && (
                  <p className="text-xs text-gray-400 mt-1">📍 Location saved</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAddressModal(true)}
                className="w-full p-4 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl text-amber-600 dark:text-amber-400 font-body text-sm hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
              >
                + Add Delivery Location
              </button>
            )}
            <input value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Delivery instructions (optional)" className="w-full mt-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 focus:border-amber-400 focus:outline-none font-body text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400" />
          </div>

          {/* Payment */}
          <div className="p-4 bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40">
            <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">💳 Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              {[{ id:'COD', label:'Cash on Delivery', icon:'💵', sub:'Pay when delivered' }, { id:'RAZORPAY', label:'Pay Online', icon:'💳', sub:'UPI · Cards · Wallets' }].map(({ id, label, icon, sub }) => (
                <button key={id} onClick={() => setPaymentMethod(id)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${paymentMethod === id ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 shadow-md' : 'border-amber-100 dark:border-amber-900/40 hover:border-amber-300'}`}>
                  <span className="text-2xl">{icon}</span>
                  <span className="font-body font-bold text-sm text-gray-800 dark:text-gray-200">{label}</span>
                  <span className="text-[10px] text-gray-400 font-body">{sub}</span>
                  {paymentMethod === id && <span className="text-amber-600 text-[10px] font-bold">✓ Selected</span>}
                </button>
              ))}
            </div>
            {paymentMethod === 'RAZORPAY' && (
              <p className="mt-2 text-xs font-body text-blue-600 dark:text-blue-400 flex items-center gap-1.5 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                🔒 Secured by Razorpay
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-100 dark:border-amber-900/40">
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Bill Summary</h3>
            </div>
            <div className="p-4 space-y-3 text-sm font-body">
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Delivery fee</span><span>{formatCurrency(deliveryFee)}</span></div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>GST (5%)</span><span>{formatCurrency(tax)}</span></div>
              <div className="border-t border-amber-100 dark:border-amber-900/40 pt-3 flex justify-between font-display font-bold text-base text-gray-900 dark:text-white">
                <span>Total</span><span className="text-amber-600 dark:text-amber-400">{formatCurrency(total)}</span>
              </div>
              <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-xs text-green-700 dark:text-green-400">
                ⏱️ Est. delivery: <strong>{kitchen?.estimatedDeliveryTime || 30}–{(kitchen?.estimatedDeliveryTime || 30) + 10} min</strong>
              </div>
            </div>
            <div className="px-4 pb-4">
              <button onClick={handleCheckout} disabled={placing}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold py-4 rounded-2xl shadow-lg shadow-amber-400/30 hover:shadow-amber-400/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 transition-all text-base">
                {placing ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing...</>
                  : paymentMethod === 'RAZORPAY' ? <><span>💳</span> Pay {formatCurrency(total)}</> : <><span>🛒</span> Place Order</>}
              </button>
              <p className="text-center text-[11px] text-gray-400 mt-2 font-body">
                {paymentMethod === 'COD' ? '💵 Pay in cash on delivery' : '🔒 100% secure Razorpay payment'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelect={handleAddressSelect}
        currentAddress={selectedAddress?.fullAddress}
      />
    </div>
  )
}
