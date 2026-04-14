import { useState, useEffect, useCallback } from 'react'
import { kitchenAPI } from '../../services/api'
import { StatusBadge, EmptyState, ConfirmModal } from '../../components/common/index'
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers'
import { useWebSocket } from '../../hooks/useWebSocket'
import toast from 'react-hot-toast'

// Get kitchen ID from profile for WebSocket subscription
const useKitchenId = () => {
  const [kitchenId, setKitchenId] = useState(null)
  useEffect(() => {
    kitchenAPI.getProfile().then(r => setKitchenId(r.data.id)).catch(() => {})
  }, [])
  return kitchenId
}

const STATUS_TABS = [
  { key: 'ALL', label: 'All Orders', icon: '📋' },
  { key: 'PENDING', label: 'New', icon: '🕐' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
  { key: 'PREPARING', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'READY_FOR_PICKUP', label: 'Ready', icon: '📦' },
  { key: 'WITH_RIDER', label: 'With Rider', icon: '🛵' },
  { key: 'DELIVERED', label: 'Delivered', icon: '🎉' },
  { key: 'CANCELLED', label: 'Cancelled', icon: '❌' },
]

export default function KitchenOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ALL')
  const [expanded, setExpanded] = useState(null)
  const [cancelId, setCancelId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [kitchenId, setKitchenId] = useState(null)

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await kitchenAPI.getOrders()
      setOrders(data)
    } catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchOrders()
    kitchenAPI.getProfile().then(r => setKitchenId(r.data.id)).catch(() => {})
  }, [])

  // Real-time order notifications
  useWebSocket(kitchenId ? [{
    topic: `/topic/kitchen/${kitchenId}/orders`,
    callback: () => { fetchOrders(); toast('🔔 New order received!', { icon: '🛒' }) }
  }] : [])

  const filtered = tab === 'ALL' ? orders : orders.filter(o => {
    if (tab === 'PENDING') return o.status === 'PENDING'
    if (tab === 'READY_FOR_PICKUP') return o.status === 'READY_FOR_PICKUP'
    if (tab === 'WITH_RIDER') return ['ACCEPTED','HEADING_TO_RESTAURANT','ARRIVED_AT_RESTAURANT','PICKED_UP','HEADING_TO_CUSTOMER'].includes(o.status)
    return o.status === tab
  })

  const action = async (fn, orderId, successMsg) => {
    setActionLoading(orderId)
    try {
      await fn(orderId)
      toast.success(successMsg)
      fetchOrders()
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed') }
    finally { setActionLoading(null) }
  }

  const getActions = (order) => {
    const btn = (label, fn, color = 'orange') => ({ label, fn, color })
    const colorMap = {
      orange: 'bg-orange-gradient text-white hover:shadow-orange',
      green: 'bg-green-500 text-white hover:bg-green-600',
      blue: 'bg-blue-500 text-white hover:bg-blue-600',
      red: 'bg-red-50 text-red-600 hover:bg-red-100',
    }
    const actions = []
    switch (order.status) {
      case 'PENDING':   actions.push(btn('✅ Confirm', () => action(kitchenAPI.confirmOrder, order.id, 'Order confirmed!'))); break
      case 'CONFIRMED': actions.push(btn('👨‍🍳 Start Preparing', () => action(kitchenAPI.markPreparing, order.id, 'Order is being prepared!'), 'blue')); break
      case 'PREPARING': actions.push(btn('📦 Mark Ready', () => action(kitchenAPI.markReady, order.id, 'Order ready! Finding rider...'), 'green')); break
    }
    if (!['DELIVERED','CANCELLED','PICKED_UP','HEADING_TO_CUSTOMER'].includes(order.status)) {
      actions.push(btn('❌ Cancel', () => setCancelId(order.id), 'red'))
    }
    return actions.map(a => ({ ...a, colorClass: colorMap[a.color] }))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">Order Management 📋</h1>
        <p className="text-sm font-body text-gray-500 dark:text-gray-400">{orders.length} total orders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_TABS.map(({ key, label, icon }) => {
          const count = key === 'ALL' ? orders.length
            : key === 'PENDING' ? orders.filter(o => o.status === 'PENDING').length
            : key === 'READY_FOR_PICKUP' ? orders.filter(o => o.status === 'READY_FOR_PICKUP').length
            : key === 'WITH_RIDER' ? orders.filter(o => ['ACCEPTED','HEADING_TO_RESTAURANT','ARRIVED_AT_RESTAURANT','PICKED_UP','HEADING_TO_CUSTOMER'].includes(o.status)).length
            : orders.filter(o => o.status === key).length
          return (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-body font-bold whitespace-nowrap transition-all ${
                tab === key ? 'bg-orange-gradient text-white shadow-orange' : 'bg-white dark:bg-brand-dark-card text-gray-600 dark:text-gray-400 border border-orange-100 dark:border-brand-dark-border'
              }`}>
              <span>{icon}</span>
              <span>{label}</span>
              {count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab === key ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-600'}`}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-3xl shimmer" />)
        ) : filtered.length === 0 ? (
          <EmptyState icon="📭" title="No orders here" message="Orders will appear when customers place them." />
        ) : (
          filtered.map(order => {
            const actions = getActions(order)
            const isExpanded = expanded === order.id
            return (
              <div key={order.id} className="card overflow-hidden">
                <div className="p-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : order.id)}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-sm">{order.orderNumber}</span>
                        <StatusBadge status={order.status} />
                        <span className="text-xs font-body text-gray-400">{timeAgo(order.createdAt)}</span>
                      </div>
                      <p className="font-body text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                        👤 {order.customer?.name} · {order.items?.length} items · {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="font-body text-xs text-gray-500 dark:text-gray-400 truncate">
                        📍 {order.deliveryAddress}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {actions.slice(0, 1).map((a, i) => (
                        <button key={i} onClick={e => { e.stopPropagation(); a.fn() }}
                          disabled={actionLoading === order.id}
                          className={`text-xs font-body font-bold px-3 py-2 rounded-xl transition-all ${a.colorClass}`}>
                          {actionLoading === order.id ? '...' : a.label}
                        </button>
                      ))}
                      <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-orange-50 dark:border-brand-dark-border p-4 bg-orange-50/30 dark:bg-brand-dark-border/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-body font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">Order Items</h4>
                        <div className="space-y-1.5">
                          {order.items?.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="font-body text-gray-600 dark:text-gray-400">
                                {item.quantity}× {item.itemName}
                              </span>
                              <span className="font-body font-semibold text-gray-800 dark:text-gray-200">
                                {formatCurrency(item.totalPrice)}
                              </span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-orange-100 dark:border-brand-dark-border flex justify-between font-body font-bold">
                            <span className="text-gray-700 dark:text-gray-300">Total</span>
                            <span className="text-orange-600 dark:text-orange-400">{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-body font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">Delivery Info</h4>
                        <p className="text-xs font-body text-gray-600 dark:text-gray-400 mb-1">📍 {order.deliveryAddress}</p>
                        <p className="text-xs font-body text-gray-600 dark:text-gray-400 mb-1">💳 {order.paymentMethod} · {order.paymentStatus}</p>
                        {order.deliveryInstructions && (
                          <p className="text-xs font-body text-gray-500 dark:text-gray-400 italic">📝 {order.deliveryInstructions}</p>
                        )}
                        {order.deliveryPartner && (
                          <p className="text-xs font-body text-gray-600 dark:text-gray-400 mt-1">🛵 {order.deliveryPartner.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {actions.map((a, i) => (
                        <button key={i} onClick={a.fn} disabled={actionLoading === order.id}
                          className={`text-xs font-body font-bold px-4 py-2 rounded-xl transition-all ${a.colorClass}`}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <ConfirmModal isOpen={!!cancelId} onClose={() => setCancelId(null)}
        onConfirm={() => action(kitchenAPI.cancelOrder, cancelId, 'Order cancelled')}
        title="Cancel Order?" message="Are you sure you want to cancel this order?" confirmText="Cancel Order" danger />
    </div>
  )
}
