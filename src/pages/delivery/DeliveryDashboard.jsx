import { useState, useEffect, useCallback, useRef } from 'react'
import { deliveryAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { StatusBadge, EmptyState, StatCard } from '../../components/common/index'
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useGPSSender } from '../../hooks/useGPSSender'
import toast from 'react-hot-toast'

const asArray = (value) => Array.isArray(value) ? value : []

const DELIVERY_STEPS = {
  ACCEPTED: { step: 0, label: 'Order Accepted', icon: '✅' },
  HEADING_TO_RESTAURANT: { step: 1, label: 'Heading to Restaurant', icon: '🛵' },
  ARRIVED_AT_RESTAURANT: { step: 2, label: 'Arrived at Restaurant', icon: '📍' },
  PICKED_UP: { step: 3, label: 'Picked Up', icon: '🍱' },
  HEADING_TO_CUSTOMER: { step: 4, label: 'Heading to Customer', icon: '🚀' },
  DELIVERED: { step: 5, label: 'Delivered', icon: '🎉' },
}

const ACTION_MAP = {
  ACCEPTED: { next: 'headingToRestaurant', label: '🛵 Head to Restaurant' },
  HEADING_TO_RESTAURANT: { next: 'arrived', label: '📍 Arrived at Restaurant' },
  ARRIVED_AT_RESTAURANT: { next: 'pickedUp', label: '🍱 Pick Up Order' },
  PICKED_UP: { next: 'headingToCustomer', label: '🚀 Head to Customer' },
  HEADING_TO_CUSTOMER: { next: 'delivered', label: '✅ Mark Delivered' },
}

export default function DeliveryDashboard() {
  const { user, updateUser } = useAuth()
  const [availableOrders, setAvailableOrders] = useState([])
  const [myOrders, setMyOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('available')
  const [actionId, setActionId] = useState(null)
  const [gpsActive, setGpsActive] = useState(false)

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

  useEffect(() => { fetchData() }, [fetchData])

  const activeOrder = myOrders.find(o => 
    ['ACCEPTED', 'PARTNER_ASSIGNED', 'HEADING_TO_RESTAURANT', 'ARRIVED_AT_RESTAURANT', 'PICKED_UP', 'HEADING_TO_CUSTOMER'].includes(o.status)
  )

  useGPSSender(activeOrder?.id, user?.id, gpsActive)

  useWebSocket([{
    topic: '/topic/delivery/available-orders',
    callback: () => {
      fetchData()
      toast('🔔 New order available!', { icon: '🛵' })
    }
  }])

  const handleToggleAvailability = async () => {
    try {
      const { data } = await deliveryAPI.toggleAvailability()
      updateUser({ ...user, isAvailable: data.isAvailable })
      toast.success(data.isAvailable ? '🟢 You are now ONLINE' : '🔴 You are now OFFLINE')
    } catch { toast.error('Failed to update') }
  }

  const handleAccept = async (orderId) => {
    setActionId(orderId)
    try {
      await deliveryAPI.acceptOrder(orderId)
      toast.success('🎉 Order accepted!')
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to accept') }
    finally { setActionId(null) }
  }

  const handleNextStep = async (order, action) => {
    setActionId(order.id)
    try {
      if (action === 'headingToRestaurant') {
        await deliveryAPI.startTrip(order.id)
        toast.success('🛵 GPS tracking started! Head to restaurant.')
        setGpsActive(true)
      } else if (action === 'arrived') {
        await deliveryAPI.arrived(order.id)
        toast.success('📍 You arrived! Wait for food preparation.')
      } else if (action === 'pickedUp') {
        await deliveryAPI.pickedUp(order.id)
        toast.success('🍱 Picked up! Head to customer.')
      } else if (action === 'headingToCustomer') {
        await deliveryAPI.headingToCustomer(order.id)
        toast.success('🚀 Heading to customer!')
      } else if (action === 'delivered') {
        await deliveryAPI.markDelivered(order.id)
        toast.success('🎉 Order delivered! Great job!')
        setGpsActive(false)
      }
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally {
      setActionId(null)
    }
  }

  const completedOrders = myOrders.filter(o => o.status === 'DELIVERED')
  const earnings = completedOrders.reduce((sum, o) => sum + (o.totalAmount * 0.1), 0)
  const currentStep = activeOrder ? DELIVERY_STEPS[activeOrder.status] : null
  const currentAction = activeOrder ? ACTION_MAP[activeOrder.status] : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card p-6 flex flex-wrap items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-gradient flex items-center justify-center text-3xl flex-shrink-0">🛵</div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">{user?.name}</h1>
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">{user?.vehicleType} · {user?.vehicleNumber}</p>
        </div>
        <button onClick={handleToggleAvailability}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-body font-bold transition-all ${
            user?.isAvailable
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-brand-dark-border dark:text-gray-400'
          }`}>
          <span className={`w-3 h-3 rounded-full ${user?.isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {user?.isAvailable ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Total Deliveries" value={completedOrders.length} />
        <StatCard icon="🚀" label="Active Order" value={activeOrder ? '1' : '0'} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600" />
        <StatCard icon="⏳" label="Available Orders" value={availableOrders.length} iconBg="bg-yellow-100 dark:bg-yellow-900/30" iconColor="text-yellow-600" />
        <StatCard icon="💰" label="Est. Earnings" value={formatCurrency(earnings)} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600" />
      </div>

      {activeOrder && (
        <div className="card border-2 border-orange-400 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">{currentStep?.icon}</div>
                <div>
                  <p className="font-display font-bold text-white">{currentStep?.label}</p>
                  <p className="text-white/70 text-xs font-mono">{activeOrder.orderNumber}</p>
                </div>
              </div>
              {gpsActive && (
                <div className="flex items-center gap-2 text-white/80 text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  GPS Live
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-1">
              {[0,1,2,3,4,5].map(step => (
                <div key={step} className={`h-1.5 flex-1 rounded-full ${step <= (currentStep?.step || 0) ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm">1</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase">Pickup</p>
                <p className="font-bold">{activeOrder.kitchen?.name}</p>
                <p className="text-sm text-gray-600">{activeOrder.kitchen?.address}</p>
                <p className="text-xs text-gray-500">📞 {activeOrder.kitchen?.phone || 'No phone'}</p>
              </div>
            </div>

            <div className="ml-4 pl-3 border-l-2 border-dashed border-amber-300 h-4" />

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm">2</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase">Drop</p>
                <p className="font-bold">{activeOrder.customer?.name}</p>
                <p className="text-sm text-gray-600">{activeOrder.deliveryAddress}</p>
                <p className="text-xs text-gray-500">📞 {activeOrder.customer?.phone || 'No phone'}</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <div className="flex justify-between">
                <span className="text-sm">{activeOrder.items?.length} items</span>
                <span className="font-bold text-orange-600">{formatCurrency(activeOrder.totalAmount)}</span>
              </div>
              {activeOrder.deliveryInstructions && (
                <p className="text-xs text-gray-500 mt-1">📝 {activeOrder.deliveryInstructions}</p>
              )}
            </div>

            {currentAction && (
              <button
                onClick={() => handleNextStep(activeOrder, currentAction.next)}
                disabled={actionId === activeOrder.id}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                  currentStep?.step < 3 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
                } ${actionId === activeOrder.id ? 'opacity-70' : ''}`}
              >
                {actionId === activeOrder.id ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                ) : currentAction.label}
              </button>
            )}

            {activeOrder.status === 'DELIVERED' && (
              <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-4 text-center">
                <p className="text-2xl">🎉</p>
                <p className="font-bold text-green-700">Order Delivered!</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="flex gap-2 mb-4">
          {[
            { key: 'available', label: `Available (${availableOrders.length})`, icon: '📦' },
            { key: 'history', label: `History (${myOrders.length})`, icon: '🕐' },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                tab === key ? 'bg-orange-gradient text-white shadow-orange' : 'bg-white dark:bg-brand-dark-card text-gray-600 border border-orange-100'
              }`}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-3xl shimmer" />)}</div>
        ) : tab === 'available' ? (
          availableOrders.length === 0 ? (
            <EmptyState icon="📦" title={user?.isAvailable ? "No orders available" : "You're offline"}
              message={user?.isAvailable ? "New orders will appear here." : "Go online to receive orders."} />
          ) : (
            <div className="space-y-3">
              {availableOrders.map(order => (
                <div key={order.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-orange-600">{order.orderNumber}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="font-bold">{order.kitchen?.name}</p>
                      <p className="text-sm text-gray-500">📍 {order.kitchen?.address}</p>
                      <p className="text-sm text-gray-500">🏠 → {order.deliveryAddress}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="font-bold text-orange-600">{formatCurrency(order.totalAmount)}</span>
                        <span className="text-xs text-gray-400">{order.items?.length} items</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAccept(order.id)}
                      disabled={actionId === order.id || !!activeOrder}
                      className={`btn-primary whitespace-nowrap ${activeOrder ? 'opacity-50' : ''}`}
                    >
                      {actionId === order.id ? '...' : '🛵 Accept'}
                    </button>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-orange-600">{order.orderNumber}</span>
                      <p className="font-bold">{order.kitchen?.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(order.totalAmount)} · {formatDate(order.createdAt)}</p>
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
