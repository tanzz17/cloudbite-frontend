import { useState, useEffect, useCallback } from 'react'
import { deliveryAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { StatusBadge, EmptyState, StatCard } from '../../components/common/index'
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers'
import { useWebSocket } from '../../hooks/useWebSocket'
import toast from 'react-hot-toast'

const asArray = (value) => Array.isArray(value) ? value : []

export default function DeliveryDashboard() {
  const { user, updateUser } = useAuth()
  const [availableOrders, setAvailableOrders] = useState([])
  const [myOrders, setMyOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('available')
  const [actionId, setActionId] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [avail, mine] = await Promise.all([
        deliveryAPI.getAvailableOrders(),
        deliveryAPI.getMyOrders(),
      ])
      setAvailableOrders(asArray(avail.data))
      setMyOrders(asArray(mine.data))
    } catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [])

  // Real-time: new orders available
  useWebSocket([{
    topic: '/topic/delivery/available-orders',
    callback: () => {
      fetchData()
      toast('🔔 New order available for pickup!', { icon: '🛵' })
    }
  }])

  // Location tracking while on active delivery
  useEffect(() => {
    if (!user?.isAvailable) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const activeOrder = myOrders.find(o => ['PARTNER_ASSIGNED','HANDOVER','OUT_FOR_DELIVERY'].includes(o.status))
        deliveryAPI.updateLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          orderId: activeOrder?.id || null,
        }).catch(() => {})
      },
      () => {}, { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [user?.isAvailable, myOrders])

  const handleToggleAvailability = async () => {
    try {
      const { data } = await deliveryAPI.toggleAvailability()
      updateUser({ ...user, isAvailable: data.isAvailable })
      toast.success(data.isAvailable ? '🟢 You are now AVAILABLE' : '🔴 You are now OFFLINE')
    } catch { toast.error('Failed to update') }
  }

  const handleAccept = async (orderId) => {
    setActionId(orderId)
    try {
      await deliveryAPI.acceptOrder(orderId)
      toast.success('🎉 Order accepted! Head to the kitchen.')
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to accept') }
    finally { setActionId(null) }
  }

  const handleDelivered = async (orderId) => {
    setActionId(orderId)
    try {
      await deliveryAPI.markDelivered(orderId)
      toast.success('🎉 Order delivered! Great job!')
      fetchData()
    } catch { toast.error('Failed to mark delivered') }
    finally { setActionId(null) }
  }

  const activeOrder = myOrders.find(o => ['PARTNER_ASSIGNED','HANDOVER','OUT_FOR_DELIVERY'].includes(o.status))
  const completedOrders = myOrders.filter(o => o.status === 'DELIVERED')
  const earnings = completedOrders.reduce((sum, o) => sum + (o.totalAmount * 0.1), 0) // 10% approx

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card p-6 flex flex-wrap items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-gradient flex items-center justify-center text-3xl flex-shrink-0">🛵</div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">{user?.name}</h1>
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">{user?.vehicleType} · {user?.vehicleNumber}</p>
        </div>
        <button onClick={handleToggleAvailability}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-body font-bold transition-all ${
            user?.isAvailable
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 animate-pulse-orange'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-brand-dark-border dark:text-gray-400'
          }`}>
          <span className={`w-3 h-3 rounded-full ${user?.isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {user?.isAvailable ? 'ONLINE - Tap to Go Offline' : 'OFFLINE - Tap to Go Online'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Total Deliveries" value={completedOrders.length} />
        <StatCard icon="🚀" label="Active Order" value={activeOrder ? '1' : '0'} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600" />
        <StatCard icon="⏳" label="Available Orders" value={availableOrders.length} iconBg="bg-yellow-100 dark:bg-yellow-900/30" iconColor="text-yellow-600" />
        <StatCard icon="💰" label="Est. Earnings" value={formatCurrency(earnings)} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600" />
      </div>

      {/* Active delivery */}
      {activeOrder && (
        <div className="card border-2 border-orange-400 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <h3 className="font-display font-bold text-orange-600 dark:text-orange-400">Active Delivery</h3>
          </div>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-orange-600 dark:text-orange-400">{activeOrder.orderNumber}</p>
              <p className="font-display font-bold text-gray-900 dark:text-white">{activeOrder.kitchen?.name}</p>
              <p className="text-sm font-body text-gray-600 dark:text-gray-400 mt-1">📍 Deliver to: {activeOrder.deliveryAddress}</p>
              <p className="text-sm font-body text-gray-600 dark:text-gray-400">👤 {activeOrder.customer?.name} · 📞 {activeOrder.customer?.phone}</p>
              <p className="text-sm font-body font-bold text-orange-600 dark:text-orange-400 mt-1">{formatCurrency(activeOrder.totalAmount)}</p>
              <StatusBadge status={activeOrder.status} />
            </div>
            <button onClick={() => handleDelivered(activeOrder.id)} disabled={actionId === activeOrder.id}
              className="btn-primary flex items-center gap-2">
              {actionId === activeOrder.id ? '...' : '✅ Mark Delivered'}
            </button>
          </div>
        </div>
      )}

      {/* Orders tabs */}
      <div>
        <div className="flex gap-2 mb-4">
          {[
            { key: 'available', label: `Available Orders (${availableOrders.length})`, icon: '📦' },
            { key: 'history', label: `My History (${myOrders.length})`, icon: '🕐' },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-body font-bold text-sm transition-all ${
                tab === key ? 'bg-orange-gradient text-white shadow-orange' : 'bg-white dark:bg-brand-dark-card text-gray-600 dark:text-gray-400 border border-orange-100 dark:border-brand-dark-border'
              }`}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-3xl shimmer" />)}</div>
        ) : tab === 'available' ? (
          availableOrders.length === 0 ? (
            <EmptyState icon="📦" title={user?.isAvailable ? "No orders available right now" : "You're offline"}
              message={user?.isAvailable ? "New orders will appear here when kitchens mark them ready." : "Go online to start receiving orders."} />
          ) : (
            <div className="space-y-3">
              {availableOrders.map(order => (
                <div key={order.id} className="card p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">{order.orderNumber}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="font-display font-bold text-gray-900 dark:text-white">{order.kitchen?.name}</p>
                    <p className="text-sm font-body text-gray-500 dark:text-gray-400">📍 {order.kitchen?.address}</p>
                    <p className="text-sm font-body text-gray-500 dark:text-gray-400">🏠 Deliver to: {order.deliveryAddress}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-body font-bold text-orange-600">{formatCurrency(order.totalAmount)}</span>
                      <span className="text-xs text-gray-400">{order.items?.length} items</span>
                      <span className="text-xs text-gray-400">{timeAgo(order.createdAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleAccept(order.id)} disabled={actionId === order.id || !!activeOrder}
                    className={`btn-primary flex items-center gap-2 ${activeOrder ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {actionId === order.id ? '...' : '🛵 Accept'}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          myOrders.length === 0 ? (
            <EmptyState icon="🕐" title="No deliveries yet" message="Accept orders to start delivering." />
          ) : (
            <div className="space-y-3">
              {myOrders.map(order => (
                <div key={order.id} className="card p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">{order.orderNumber}</span>
                      <p className="font-display font-bold text-gray-900 dark:text-white">{order.kitchen?.name}</p>
                      <p className="text-xs font-body text-gray-500">{formatCurrency(order.totalAmount)} · {formatDate(order.createdAt)}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
