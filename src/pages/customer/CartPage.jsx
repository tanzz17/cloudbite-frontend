import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { customerAPI } from '../../services/api'
import { formatCurrency } from '../../utils/helpers'
import { redirectToHostedRazorpayPayment } from '../../utils/razorpay'
import toast from 'react-hot-toast'

export default function CartPage() {
  const { cart, updateItem, fetchCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '')
  const [instructions, setInstructions] = useState('')
  const [placing, setPlacing] = useState(false)

  const items = cart?.items || []
  const kitchen = cart?.kitchen
  const subtotal = items.reduce((sum, item) => sum + ((item.menuItem?.price || 0) * item.quantity), 0)
  const deliveryFee = kitchen?.deliveryFee || 30
  const tax = subtotal * 0.05
  const total = subtotal + deliveryFee + tax

  const handleQty = async (cartItemId, qty) => {
    try {
      await updateItem(cartItemId, qty)
    } catch {
      toast.error('Failed to update cart')
    }
  }

  const handleCheckout = async () => {
    if (!deliveryAddress.trim()) {
      toast.error('Please enter delivery address')
      return
    }
    if (items.length === 0) {
      toast.error('Cart is empty')
      return
    }

    setPlacing(true)
    try {
      const orderData = {
        kitchenId: kitchen.id,
        items: items.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        })),
        deliveryAddress,
        deliveryInstructions: instructions,
        paymentMethod,
      }

      const { data: order } = await customerAPI.placeOrder(orderData)

      if (paymentMethod === 'RAZORPAY') {
        await fetchCart()
        toast.success('Redirecting to Razorpay secure payment page...')
        await redirectToHostedRazorpayPayment({ orderId: order.id })
        return
      }

      toast.success('Order placed! Pay on delivery.')
      await fetchCart()
      navigate(`/orders/${order.id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to place order')
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-7xl mb-4 animate-bounce-soft">Cart</div>
          <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
          <p className="font-body text-gray-500 dark:text-gray-400 mb-6">Add some dishes to get started.</p>
          <button onClick={() => navigate('/home')} className="btn-primary">Browse Kitchens</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-2xl" aria-label="Go back">←</button>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Your Cart</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {kitchen && (
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center text-xl">K</div>
                <div>
                  <p className="font-display font-bold text-gray-900 dark:text-white">{kitchen.name}</p>
                  <p className="text-xs font-body text-gray-500">{kitchen.city}</p>
                </div>
              </div>
            )}

            {items.map((item) => (
              <div key={item.id} className="card p-4 flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-orange-50 dark:bg-orange-900/20 flex-shrink-0">
                  {item.menuItem?.imageUrl ? (
                    <img src={item.menuItem.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">Item</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-gray-900 dark:text-white truncate">{item.menuItem?.name}</h4>
                  <p className="font-body font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(item.menuItem?.price)}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleQty(item.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full border-2 border-orange-400 text-orange-600 flex items-center justify-center font-bold hover:bg-orange-50 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-body font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                  <button
                    onClick={() => handleQty(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-orange-gradient text-white flex items-center justify-center font-bold hover:shadow-orange transition-all"
                  >
                    +
                  </button>
                </div>

                <p className="font-body font-bold text-gray-900 dark:text-white w-16 text-right flex-shrink-0">
                  {formatCurrency((item.menuItem?.price || 0) * item.quantity)}
                </p>
              </div>
            ))}

            <div className="card p-4">
              <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">Delivery Address</h3>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your full delivery address..."
                className="input-field resize-none"
                rows={3}
              />
              <input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Special instructions (optional)..."
                className="input-field mt-3"
              />
            </div>

            <div className="card p-4">
              <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">Payment Method</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'COD', label: 'Cash on Delivery' },
                  { id: 'RAZORPAY', label: 'Pay Online' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-orange-100 dark:border-brand-dark-border bg-white dark:bg-brand-dark-card'
                    }`}
                  >
                    <span className="font-body font-semibold text-sm text-gray-800 dark:text-gray-200">{label}</span>
                    {paymentMethod === id && <span className="text-orange-600 text-xs font-bold">Selected</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="card p-5 sticky top-4">
              <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Order Summary</h3>
              <div className="space-y-3 text-sm font-body">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal ({items.length} items)</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Delivery fee</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>GST (5%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="border-t border-orange-100 dark:border-brand-dark-border pt-3 flex justify-between font-display font-bold text-base text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span className="text-orange-600 dark:text-orange-400">{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={placing}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2 py-4 text-base"
              >
                {placing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Placing order...
                  </>
                ) : paymentMethod === 'RAZORPAY' ? (
                  'Continue to Payment'
                ) : (
                  'Place Order'
                )}
              </button>

              <p className="text-center text-xs font-body text-gray-400 mt-3">
                {paymentMethod === 'COD' ? 'Pay cash when delivered' : 'You will continue on Razorpay hosted payment page'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
