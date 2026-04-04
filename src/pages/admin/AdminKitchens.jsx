// AdminKitchens.jsx
import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import { ConfirmModal, EmptyState } from '../../components/common/index'
import { formatDate, formatCurrency } from '../../utils/helpers'
import toast from 'react-hot-toast'

export function AdminKitchens() {
  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [search, setSearch] = useState('')

  const fetch = () => {
    adminAPI.getAllKitchens()
      .then(r => setKitchens(r.data))
      .catch(() => toast.error('Failed to load kitchens'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  const filtered = kitchens.filter(k =>
    k.name?.toLowerCase().includes(search.toLowerCase()) ||
    k.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Kitchens 🏪</h1>
          <p className="text-sm font-body text-gray-500 dark:text-gray-400">{kitchens.length} registered kitchens</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search kitchens..." className="input-field pl-10" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-3xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏪" title="No kitchens found" message="Kitchen owners will set up their kitchens after logging in." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(k => (
            <div key={k.id} className="card overflow-hidden">
              {k.coverImage ? (
                <img src={k.coverImage} alt={k.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-orange-gradient flex items-center justify-center text-4xl">🍽️</div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-gray-900 dark:text-white leading-tight">{k.name}</h3>
                  <span className={k.isActive ? 'badge-active' : 'badge-inactive'}>
                    {k.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs font-body text-gray-500 dark:text-gray-400 mb-1">📍 {k.city || 'City not set'}</p>
                <p className="text-xs font-body text-gray-500 dark:text-gray-400 mb-3">
                  👨‍🍳 {k.owner?.name || 'Unknown'} · ⭐ {k.rating?.toFixed(1) || '—'}
                </p>
                <p className="text-xs font-body text-gray-400">{k.cuisineType || 'Multi-cuisine'}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => adminAPI.toggleKitchenStatus(k.id).then(fetch)}
                    className={`flex-1 text-xs font-body font-bold py-2 rounded-xl transition-colors ${
                      k.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}>
                    {k.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setDeleteId(k.id)}
                    className="px-3 py-2 text-xs rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { await adminAPI.deleteKitchen(deleteId); toast.success('Kitchen deleted'); fetch() }}
        title="Delete Kitchen?" message="This will permanently remove the kitchen and all its data."
        confirmText="Delete" danger />
    </div>
  )
}

// AdminOrders.jsx
export function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    adminAPI.getAllOrders()
      .then(r => setOrders(r.data))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  const statuses = ['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">All Orders 📋</h1>
        <p className="text-sm font-body text-gray-500 dark:text-gray-400">{orders.length} total orders</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-body font-bold whitespace-nowrap transition-colors ${
              filter === s ? 'bg-orange-gradient text-white' : 'bg-white dark:bg-brand-dark-card text-gray-600 dark:text-gray-400 border border-orange-100 dark:border-brand-dark-border'
            }`}>
            {s.replace(/_/g, ' ')} {s !== 'ALL' && `(${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-xl shimmer" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📋" title="No orders found" />
        ) : (
          <table className="w-full">
            <thead className="bg-orange-50 dark:bg-brand-dark-border">
              <tr>{['Order #', 'Customer', 'Kitchen', 'Items', 'Amount', 'Payment', 'Status', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-body font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-orange-50 dark:divide-brand-dark-border">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-orange-50/50 dark:hover:bg-brand-dark-border/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono font-bold text-orange-600 dark:text-orange-400">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-sm font-body text-gray-700 dark:text-gray-300">{o.customer?.name}</td>
                  <td className="px-4 py-3 text-sm font-body text-gray-700 dark:text-gray-300">{o.kitchen?.name}</td>
                  <td className="px-4 py-3 text-sm font-body text-gray-500">{o.items?.length} items</td>
                  <td className="px-4 py-3 text-sm font-body font-bold text-gray-900 dark:text-white">{formatCurrency(o.totalAmount)}</td>
                  <td className="px-4 py-3 text-xs font-body text-gray-500">{o.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <span className={`badge badge-${o.status?.toLowerCase().replace(/_/g,'-')}`}>
                      {o.status?.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-body text-gray-400">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default AdminKitchens
