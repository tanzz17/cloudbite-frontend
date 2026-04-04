import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { getStatusBadge } from '../../utils/helpers'

// ==================== THEME TOGGLE ====================
export const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-400 ${isDark ? 'bg-orange-500' : 'bg-gray-200'} ${className}`}
      aria-label="Toggle theme"
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-300 flex items-center justify-center text-xs
        ${isDark ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white shadow-sm'}`}>
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}

// ==================== LOADING SPINNER ====================
export const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} border-3 border-orange-100 border-t-orange-500 rounded-full animate-spin`}
           style={{ borderWidth: '3px' }} />
      {text && <p className="text-sm font-body text-gray-500 dark:text-gray-400 animate-pulse">{text}</p>}
    </div>
  )
}

// ==================== FULL PAGE LOADER ====================
export const PageLoader = ({ text = 'Loading...' }) => (
  <div className="page-wrapper flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="text-5xl mb-4 animate-bounce-soft">🍽️</div>
      <LoadingSpinner size="lg" text={text} />
    </div>
  </div>
)

// ==================== PROTECTED ROUTE ====================
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const routes = { ADMIN: '/admin', KITCHEN_OWNER: '/kitchen', CUSTOMER: '/home', DELIVERY_PARTNER: '/delivery' }
    return <Navigate to={routes[user.role] || '/login'} replace />
  }

  return children
}

// ==================== STATUS BADGE ====================
export const StatusBadge = ({ status }) => {
  const config = getStatusBadge(status)
  return (
    <span className={config.color}>
      {config.icon} {config.label}
    </span>
  )
}

// ==================== EMPTY STATE ====================
export const EmptyState = ({ icon = '📭', title = 'Nothing here', message = '', action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="text-6xl mb-4 animate-float">{icon}</div>
    <h3 className="font-display text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
    {message && <p className="text-sm font-body text-gray-500 dark:text-gray-400 mb-6 max-w-xs">{message}</p>}
    {action && action}
  </div>
)

// ==================== STAT CARD ====================
export const StatCard = ({ icon, label, value, sub, iconBg = 'bg-orange-100 dark:bg-orange-900/30', iconColor = 'text-orange-600' }) => (
  <div className="stat-card animate-slide-up">
    <div className={`stat-icon ${iconBg}`}>
      <span className={`${iconColor} text-2xl`}>{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-body text-gray-500 dark:text-gray-400 truncate">{label}</p>
      <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs font-body text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

// ==================== CONFIRM MODAL ====================
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 max-w-sm w-full animate-slide-up">
        <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm font-body text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={() => { onConfirm(); onClose() }}
            className={danger ? 'btn-danger' : 'btn-primary'}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== MODAL WRAPPER ====================
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative card p-6 w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-slide-up`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ==================== FORM INPUT ====================
export const FormInput = ({ label, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="input-label">{label}</label>}
    <input className={`input-field ${error ? 'border-red-400 focus:ring-red-400' : ''}`} {...props} />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

// ==================== CLOUDITE LOGO ====================
export const CloudBiteLogo = ({ size = 'md', showText = true }) => {
  const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl', xl: 'text-5xl' }
  const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl', xl: 'text-4xl' }
  return (
    <div className="flex items-center gap-2">
      <span className={`${sizes[size]} animate-float`}>🍽️</span>
      {showText && (
        <span className={`font-display font-bold text-gradient ${textSizes[size]}`}>
          Cloud<span className="font-hand">Bite</span>
        </span>
      )}
    </div>
  )
}

// ==================== SEARCH BAR ====================
export const SearchBar = ({ value, onChange, placeholder = 'Search...', onSearch }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onSearch?.()}
      placeholder={placeholder}
      className="input-field pl-10 pr-4"
    />
  </div>
)
