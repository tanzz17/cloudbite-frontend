import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ThemeToggle, CloudBiteLogo } from './index'

const MENUS = {
  ADMIN: [
    { to: '/admin',            label: 'Dashboard',         icon: '📊' },
    { to: '/admin/kitchens',   label: 'Kitchens',          icon: '🏪' },
    { to: '/admin/owners',     label: 'Kitchen Owners',    icon: '👨‍🍳' },
    { to: '/admin/partners',   label: 'Delivery Partners', icon: '🛵' },
    { to: '/admin/orders',     label: 'All Orders',        icon: '📋' },
    { to: '/admin/profile',    label: 'Profile',           icon: '👤' },
  ],
  KITCHEN_OWNER: [
    { to: '/kitchen',          label: 'Dashboard',         icon: '📊' },
    { to: '/kitchen/menu',     label: 'Manage Menu',       icon: '🍽️' },
    { to: '/kitchen/orders',   label: 'Orders',            icon: '📋' },
    { to: '/kitchen/profile',  label: 'Kitchen Profile',   icon: '🏪' },
    { to: '/kitchen/account',  label: 'My Account',        icon: '👤' },
  ],
  CUSTOMER: [
    { to: '/home',             label: 'Browse Kitchens',   icon: '🏠' },
    { to: '/orders',           label: 'My Orders',         icon: '📋' },
    { to: '/cart',             label: 'Cart',              icon: '🛒' },
    { to: '/profile',          label: 'Profile',           icon: '👤' },
  ],
  DELIVERY_PARTNER: [
    { to: '/delivery',         label: 'Dashboard',         icon: '📊' },
    { to: '/delivery/orders',  label: 'Available Orders',  icon: '📋' },
    { to: '/delivery/history', label: 'History',           icon: '🕐' },
    { to: '/delivery/profile', label: 'Profile',           icon: '👤' },
  ],
}

export const Sidebar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const menu = MENUS[user?.role] || []

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="dash-sidebar">
      {/* Logo */}
      <div className="p-5 border-b border-orange-100 dark:border-brand-dark-border">
        <CloudBiteLogo size="md" />
        <p className="text-xs font-body text-gray-400 mt-1 font-hand capitalize">
          {user?.role?.replace('_', ' ')?.toLowerCase()} portal
        </p>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-orange-100 dark:border-brand-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-gradient flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {user?.profileImage
              ? <img src={user.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
              : user?.name?.[0]?.toUpperCase()
            }
          </div>
          <div className="min-w-0">
            <p className="font-body font-bold text-sm text-gray-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menu.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to.split('/').length === 2}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="text-xl flex-shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-orange-100 dark:border-brand-dark-border space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-body text-gray-500 dark:text-gray-400">Dark Mode</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-body font-semibold text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        >
          <span className="text-xl">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
