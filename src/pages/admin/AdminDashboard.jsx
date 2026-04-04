import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import { StatCard } from '../../components/common/index'
import { formatCurrency } from '../../utils/helpers'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.getDashboard()
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="h-28 rounded-3xl shimmer" />)}
      </div>
    </div>
  )

  const revenueData = [
    { name: 'Today', amount: stats?.todayRevenue || 0 },
    { name: 'This Week', amount: stats?.weeklyRevenue || 0 },
    { name: 'This Month', amount: stats?.monthlyRevenue || 0 },
    { name: 'All Time', amount: stats?.totalRevenue || 0 },
  ]

  const orderPieData = [
    { name: 'Delivered', value: stats?.deliveredOrders || 0, color: '#22c55e' },
    { name: 'Pending', value: stats?.pendingOrders || 0, color: '#f97316' },
    { name: 'Other', value: Math.max(0, (stats?.totalOrders || 0) - (stats?.deliveredOrders || 0) - (stats?.pendingOrders || 0)), color: '#94a3b8' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="section-title">Admin Dashboard 📊</h1>
        <p className="font-body text-sm text-gray-500 dark:text-gray-400 mt-1">
          Welcome to CloudBite HQ — here's your platform overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🏪" label="Total Kitchens"       value={stats?.totalKitchens ?? 0}         sub={`${stats?.activeKitchens ?? 0} active`} />
        <StatCard icon="🛵" label="Delivery Partners"    value={stats?.totalDeliveryPartners ?? 0}  sub={`${stats?.activeDeliveryPartners ?? 0} available`} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600" />
        <StatCard icon="👥" label="Customers"            value={stats?.totalCustomers ?? 0}         iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600" />
        <StatCard icon="📋" label="Total Orders"         value={stats?.totalOrders ?? 0}            sub={`${stats?.pendingOrders ?? 0} pending`} iconBg="bg-yellow-100 dark:bg-yellow-900/30" iconColor="text-yellow-600" />
        <StatCard icon="💰" label="Today's Revenue"      value={formatCurrency(stats?.todayRevenue)}  iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600" />
        <StatCard icon="📈" label="Weekly Revenue"       value={formatCurrency(stats?.weeklyRevenue)} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600" />
        <StatCard icon="🏆" label="Monthly Revenue"      value={formatCurrency(stats?.monthlyRevenue)} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600" />
        <StatCard icon="💎" label="All Time Revenue"     value={formatCurrency(stats?.totalRevenue)}  iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-4">Revenue Overview</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontFamily: 'Lato', fontSize: 12 }} />
              <YAxis tick={{ fontFamily: 'Lato', fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} contentStyle={{ borderRadius: '12px', fontFamily: 'Lato', border: '1px solid #fed7aa' }} />
              <Bar dataKey="amount" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Pie */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-4">Order Status</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={orderPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {orderPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', fontFamily: 'Lato' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {orderPieData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between text-sm font-body">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-gray-600 dark:text-gray-400">{name}</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Add Kitchen Owner', icon: '👨‍🍳', to: '/admin/owners' },
            { label: 'Add Delivery Partner', icon: '🛵', to: '/admin/partners' },
            { label: 'Manage Kitchens', icon: '🏪', to: '/admin/kitchens' },
            { label: 'View All Orders', icon: '📋', to: '/admin/orders' },
          ].map(({ label, icon, to }) => (
            <a key={label} href={to}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-orange-50 dark:bg-brand-dark-border hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all duration-200 cursor-pointer group">
              <span className="text-3xl group-hover:scale-110 transition-transform">{icon}</span>
              <span className="text-xs font-body font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
