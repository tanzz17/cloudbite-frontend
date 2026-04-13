import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { kitchenAPI } from '../../services/api'
import { StatCard, EmptyState } from '../../components/common/index'
import { formatCurrency, formatDate, getStatusBadge } from '../../utils/helpers'
import { useWebSocket } from '../../hooks/useWebSocket'
import toast from 'react-hot-toast'

const asArray = (value) => Array.isArray(value) ? value : []

export default function KitchenDashboard() {
  const [kitchen, setKitchen] = useState(null)
  const [orders, setOrders] = useState([])
  const [revenue, setRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchData = async () => {
    try {
      const [kitchenRes, ordersRes, revRes] = await Promise.all([
        kitchenAPI.getProfile(),
        kitchenAPI.getOrders(),
        kitchenAPI.getRevenue(),
      ])
      setKitchen(kitchenRes.data)
      setOrders(asArray(ordersRes.data))
      setRevenue(revRes.data.revenue || 0)
    } catch (err) {
      if (err.response?.status === 404) {
        toast('Set up your kitchen profile first!', { icon: '🏪' })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Real-time order notifications
  useWebSocket(kitchen ? [{
    topic: `/topic/kitchen/${kitchen.id}/orders`,
    callback: () => { fetchData(); toast('🔔 New order received!', { icon: '🛒' }) }
  }] : [])

  const statusGroups = {
    PENDING:   orders.filter(o => o.status === 'PENDING'),
    CONFIRMED: orders.filter(o => o.status === 'CONFIRMED'),
    PREPARING: orders.filter(o => o.status === 'PREPARING'),
    WAITING_FOR_PARTNER: orders.filter(o => o.status === 'WAITING_FOR_PARTNER' || o.status === 'READY_FOR_PICKUP'),
    WITH_RIDER: orders.filter(o => ['PARTNER_ASSIGNED','HANDOVER','OUT_FOR_DELIVERY','PICKED_UP'].includes(o.status)),
    DELIVERED: orders.filter(o => o.status === 'DELIVERED'),
  }

  const handleToggleOpen = async () => {
    try {
      const res = await kitchenAPI.toggleOpen()
      setKitchen(res.data)
      toast.success(res.data.isOpen ? '✅ Kitchen is now OPEN' : '🔴 Kitchen is now CLOSED')
    } catch { toast.error('Failed') }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="h-32 rounded-3xl shimmer" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-3xl shimmer" />)}</div>
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Kitchen header */}
      <div className="card p-6 flex flex-wrap items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-gradient flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
          {kitchen?.logoImage ? <img src={kitchen.logoImage} alt="" className="w-full h-full object-cover" /> : '🍽️'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            {kitchen?.name || 'My Kitchen'}
          </h1>
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">
            {kitchen?.cuisineType || 'Set up your kitchen profile'} · {kitchen?.city || ''}
          </p>
          {kitchen && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-body text-yellow-500">⭐ {kitchen.rating?.toFixed(1) || 'No ratings yet'}</span>
              <span className="text-xs font-body text-gray-400">·</span>
              <span className="text-xs font-body text-gray-500">Min. order {formatCurrency(kitchen.minOrderAmount)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {kitchen && (
            <button onClick={handleToggleOpen}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-body font-bold text-sm transition-all ${
                kitchen.isOpen
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
              }`}>
              <span className={`w-2 h-2 rounded-full ${kitchen.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {kitchen.isOpen ? 'OPEN' : 'CLOSED'}
            </button>
          )}
          {!kitchen && (
            <button onClick={() => navigate('/kitchen/profile')} className="btn-primary">
              Set Up Kitchen
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📋" label="Total Orders" value={orders.length} />
        <StatCard icon="🕐" label="Pending" value={statusGroups.PENDING?.length || 0} iconBg="bg-yellow-100 dark:bg-yellow-900/30" iconColor="text-yellow-600" />
        <StatCard icon="🛵" label="With Rider" value={statusGroups.WITH_RIDER?.length || 0} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600" />
        <StatCard icon="💰" label="Total Revenue" value={formatCurrency(revenue)} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600" />
      </div>

      {/* Live orders kanban */}
      <div>
        <h2 className="section-title mb-4">Live Orders Board 📊</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { key: 'PENDING', label: '🕐 Pending', color: 'border-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
            { key: 'CONFIRMED', label: '✅ Confirmed', color: 'border-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10' },
            { key: 'PREPARING', label: '👨‍🍳 Preparing', color: 'border-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/10' },
            { key: 'WAITING_FOR_PARTNER', label: '🔍 Finding Rider', color: 'border-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10' },
            { key: 'WITH_RIDER', label: '🛵 With Rider', color: 'border-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/10' },
            { key: 'DELIVERED', label: '🎉 Delivered Today', color: 'border-green-400', bg: 'bg-green-50 dark:bg-green-900/10' },
          ].map(({ key, label, color, bg }) => (
            <div key={key} className={`card border-t-4 ${color}`}>
              <div className={`px-4 py-3 ${bg} flex items-center justify-between`}>
                <span className="font-body font-bold text-sm text-gray-800 dark:text-gray-200">{label}</span>
                <span className="w-6 h-6 rounded-full bg-white dark:bg-brand-dark-card flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                  {statusGroups[key]?.length || 0}
                </span>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                {(statusGroups[key] || []).length === 0 ? (
                  <p className="text-xs font-body text-gray-400 text-center py-4">No orders</p>
                ) : (
                  (statusGroups[key] || []).slice(0, 5).map(order => (
                    <div key={order.id}
                      onClick={() => navigate('/kitchen/orders')}
                      className="p-3 bg-white dark:bg-brand-dark-surface rounded-xl border border-orange-50 dark:border-brand-dark-border cursor-pointer hover:border-orange-200 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs font-body text-gray-400">{formatCurrency(order.totalAmount)}</span>
                      </div>
                      <p className="text-xs font-body text-gray-600 dark:text-gray-400 truncate">
                        {order.customer?.name} · {order.items?.length} items
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
