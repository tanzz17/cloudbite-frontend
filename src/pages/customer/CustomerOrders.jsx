import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { StatusBadge, EmptyState } from '../../components/common/index'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDate, timeAgo, getStepIndex, TRACKING_STEPS } from '../../utils/helpers'
import { useWebSocket } from '../../hooks/useWebSocket'
import { openRazorpayCheckout } from '../../utils/razorpay'
import toast from 'react-hot-toast'

const asArray = (value) => Array.isArray(value) ? value : []

// ==================== ORDERS LIST ====================
export function CustomerOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    customerAPI.getOrders()
      .then(r => setOrders(asArray(r.data)))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg px-4 py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-6">My Orders 📋</h1>

      {loading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-3xl shimmer" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState icon="📋" title="No orders yet" message="Place your first order from a cloud kitchen!"
          action={<Link to="/home" className="btn-primary">Browse Kitchens</Link>} />
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link to={`/orders/${order.id}`} key={order.id}
              className="card p-4 flex items-center gap-4 hover:shadow-orange transition-all duration-200 block">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-xs">{order.orderNumber}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="font-display font-bold text-gray-900 dark:text-white truncate">{order.kitchen?.name}</p>
                <p className="text-xs font-body text-gray-500 dark:text-gray-400">
                  {order.items?.length} items · {formatCurrency(order.totalAmount)} · {timeAgo(order.createdAt)}
                </p>
              </div>
              <span className="text-gray-400 flex-shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== ORDER DETAIL + TRACKING ====================
export function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [partnerLocation, setPartnerLocation] = useState(null)
  const [retryingPayment, setRetryingPayment] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await customerAPI.getOrder(orderId)
      setOrder(data)
    } catch { toast.error('Order not found'); navigate('/orders') }
    finally { setLoading(false) }
  }, [orderId])

  useEffect(() => { fetchOrder() }, [])

  const handleRetryPayment = async () => {
    if (!order) return
    setRetryingPayment(true)
    try {
      await openRazorpayCheckout({ orderId: order.id, user, onSuccess: fetchOrder })
      toast.success('Payment completed successfully!')
    } catch (err) {
      if (err.message === 'Payment cancelled') toast.error('Payment cancelled')
      else if (err.message === 'Unable to load Razorpay checkout') toast.error('Razorpay checkout could not load. Please check your network and try again.')
      else toast.error(err.message || 'Payment failed. Please try again.')
    } finally {
      setRetryingPayment(false)
    }
  }

  // Real-time status updates
  useWebSocket(order ? [
    {
      topic: `/topic/order/${orderId}/status`,
      callback: (msg) => {
        setOrder(prev => ({ ...prev, status: msg.status }))
        toast(`Order status: ${msg.status.replace(/_/g,' ')}`, { icon: '🔔' })
      }
    },
    {
      topic: `/topic/order/${orderId}/location`,
      callback: (loc) => setPartnerLocation({ lat: loc.lat, lng: loc.lng })
    }
  ] : [])

  if (loading) return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-4 animate-bounce-soft">🛵</div><p className="font-hand text-orange-600 text-xl">Loading order...</p></div>
    </div>
  )

  if (!order) return null
  const currentStep = getStepIndex(order.status)

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-dark-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/orders')} className="text-2xl">←</button>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">Order Details</h1>
            <p className="font-mono text-xs text-orange-600 dark:text-orange-400">{order.orderNumber}</p>
          </div>
        </div>

        {/* Status tracker */}
        <div className="card p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Order Status</h3>
            <StatusBadge status={order.status} />
          </div>

          {order.status !== 'CANCELLED' ? (
            <div className="relative mt-6">
              {/* Progress line */}
              <div className="absolute top-4 left-0 right-0 h-1 bg-gray-100 dark:bg-brand-dark-border rounded-full">
                <div
                  className="h-full bg-orange-gradient rounded-full transition-all duration-700"
                  style={{ width: `${(currentStep / (TRACKING_STEPS.length - 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between relative z-10">
                {TRACKING_STEPS.map((step, idx) => (
                  <div key={step.key} className="flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                      idx <= currentStep ? 'bg-orange-gradient text-white shadow-orange' : 'bg-gray-100 dark:bg-brand-dark-border text-gray-400'
                    }`}>
                      {idx < currentStep ? '✓' : step.icon}
                    </div>
                    <span className={`text-[10px] font-body text-center leading-tight max-w-[60px] ${
                      idx <= currentStep ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-gray-400'
                    }`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-center">
              <span className="text-3xl">❌</span>
              <p className="font-body font-bold text-red-600 dark:text-red-400 mt-1">Order Cancelled</p>
              {order.cancellationReason && <p className="text-xs text-gray-500 mt-1">{order.cancellationReason}</p>}
            </div>
          )}
        </div>

        {/* Live tracking map placeholder */}
        {['PARTNER_ASSIGNED','HANDOVER','OUT_FOR_DELIVERY'].includes(order.status) && (
          <div className="card p-4 mb-4">
            <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">🛵 Live Tracking</h3>
            <div className="h-48 rounded-2xl bg-orange-50 dark:bg-brand-dark-border flex items-center justify-center">
              {partnerLocation ? (
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-bounce-soft">🛵</div>
                  <p className="font-body font-semibold text-orange-600">Rider is on the way!</p>
                  <p className="text-xs text-gray-500 mt-1">
                    📍 {partnerLocation.lat.toFixed(4)}, {partnerLocation.lng.toFixed(4)}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-pulse">🗺️</div>
                  <p className="font-body text-gray-500 text-sm">Waiting for GPS signal...</p>
                </div>
              )}
            </div>
            {order.deliveryPartner && (
              <div className="flex items-center gap-3 mt-3 p-3 bg-orange-50 dark:bg-brand-dark-border rounded-xl">
                <div className="w-10 h-10 rounded-full bg-orange-gradient flex items-center justify-center text-white font-bold">
                  {order.deliveryPartner.name?.[0]}
                </div>
                <div>
                  <p className="font-body font-bold text-sm text-gray-900 dark:text-white">{order.deliveryPartner.name}</p>
                  <p className="text-xs text-gray-500">{order.deliveryPartner.phone}</p>
                </div>
                <a href={`tel:${order.deliveryPartner.phone}`} className="ml-auto btn-primary px-3 py-2 text-sm">📞 Call</a>
              </div>
            )}
          </div>
        )}

        {/* Kitchen info */}
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center text-xl">🍽️</div>
            <div>
              <p className="font-display font-bold text-gray-900 dark:text-white">{order.kitchen?.name}</p>
              <p className="text-xs text-gray-500">{order.kitchen?.phone}</p>
            </div>
          </div>
          <div className="space-y-2">
            {order.items?.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm font-body">
                <span className="text-gray-600 dark:text-gray-400">{item.quantity}× {item.itemName}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
            <div className="border-t border-orange-50 dark:border-brand-dark-border pt-2 mt-2 space-y-1 text-sm font-body">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></div>
              <div className="flex justify-between text-gray-500"><span>GST</span><span>{formatCurrency(order.tax)}</span></div>
              <div className="flex justify-between font-display font-bold text-gray-900 dark:text-white text-base">
                <span>Total</span><span className="text-orange-600 dark:text-orange-400">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
            {order.paymentMethod === 'RAZORPAY' && order.paymentStatus !== 'COMPLETED' && (
              <button onClick={handleRetryPayment} disabled={retryingPayment} className="btn-primary mt-4 flex items-center justify-center gap-2 px-5 py-3 text-sm">
                {retryingPayment ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Opening payment...</> : 'Complete Payment'}
              </button>
            )}
          </div>
        </div>

        {/* Delivery info */}
        <div className="card p-4">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">Delivery Info</h3>
          <p className="text-sm font-body text-gray-600 dark:text-gray-400 mb-1">📍 {order.deliveryAddress}</p>
          <p className="text-sm font-body text-gray-600 dark:text-gray-400 mb-1">
            💳 {order.paymentMethod} · <span className={order.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}>{order.paymentStatus}</span>
          </p>
          <p className="text-xs font-body text-gray-400">📅 Placed {formatDate(order.createdAt)}</p>
          {order.deliveredAt && <p className="text-xs font-body text-green-600 mt-1">🎉 Delivered {formatDate(order.deliveredAt)}</p>}
        </div>
      </div>
    </div>
  )
}
