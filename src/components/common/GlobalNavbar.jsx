import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useAddress } from '../../context/AddressContext'
import { ThemeToggle } from './index'

const PAGE_TITLES = {
  '/home':        'Browse Kitchens',
  '/cart':        'Your Cart',
  '/orders':      'My Orders',
  '/profile':     'My Profile',
}

export default function GlobalNavbar({ onAddressClick }) {
  const { user, logout } = useAuth()
  const { cartCount } = useCart()
  const isCustomer = user?.role === 'CUSTOMER'
  const { selectedAddress, addresses = [] } = isCustomer ? useAddress() : { selectedAddress: null, addresses: [] }
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [addressesExpanded, setAddressesExpanded] = useState(false)

  const isHome = location.pathname === '/home'
  const title = PAGE_TITLES[location.pathname] || ''

  const handleBack = () => navigate(-1)

  if (!user) return null

  return (
    <nav className="sticky top-0 z-50 bg-[#fdf8f0]/95 dark:bg-[#0f0a05]/95 backdrop-blur-xl border-b border-amber-100 dark:border-amber-900/40 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">

        {/* Back button */}
        {!isHome && (
          <button onClick={handleBack}
            className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-3 py-1.5 rounded-xl transition-all font-body font-semibold text-sm flex-shrink-0 group">
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        {/* Logo */}
        <button onClick={() => navigate('/home')}
          className="flex items-center gap-1.5 flex-shrink-0 group">
          <span className="text-xl group-hover:animate-bounce-soft">🍽️</span>
          <span className="font-display font-bold text-lg hidden sm:block">
            <span className="text-amber-600 dark:text-amber-400">Cloud</span>
            <span className="font-hand text-orange-500">Bite</span>
          </span>
        </button>

        {/* Delivery Address (only on home/cart/kitchen pages) */}
        {isHome && (
          <button
            onClick={onAddressClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all max-w-[200px] sm:max-w-[280px]"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] font-body text-gray-400 dark:text-gray-500 uppercase tracking-wide">Delivering to</p>
              <p className="text-xs font-body font-bold text-gray-700 dark:text-gray-200 truncate">
                {selectedAddress?.label ? (
                  <>{selectedAddress.label} {selectedAddress.receiverName ? `- ${selectedAddress.receiverName}` : ''}</>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Select Address</span>
                )}
              </p>
            </div>
            <span className="text-gray-400 text-xs flex-shrink-0">▼</span>
          </button>
        )}

        {/* Page title on mobile */}
        {title && (
          <span className="font-display font-semibold text-sm text-gray-600 dark:text-gray-400 sm:hidden truncate">{title}</span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search (home page) */}
        {isHome && (
          <div className="flex-1 max-w-sm mx-2 hidden md:block">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-xs">🔍</span>
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/home?q=${searchVal}`)}
                placeholder="Search kitchens or dishes..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30 font-body text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-all"
              />
            </div>
          </div>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <ThemeToggle className="hidden sm:flex" />

          {/* Cart */}
          <button onClick={() => navigate('/cart')}
            className="relative p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors group">
            <span className="text-lg group-hover:animate-bounce-soft">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          {/* Orders */}
          <button onClick={() => navigate('/orders')}
            className="p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-lg hidden sm:flex items-center">
            📋
          </button>

          {/* Profile */}
          <div className="relative">
            <button onClick={() => setProfileOpen(p => !p)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-orange-400/40 hover:scale-105 transition-all ml-1">
              {user?.profileImage
                ? <img src={user.profileImage} className="w-full h-full rounded-full object-cover" alt="" />
                : user?.name?.[0]?.toUpperCase()}
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1a1108] rounded-2xl shadow-2xl border border-amber-100 dark:border-amber-900/60 overflow-hidden z-50 animate-slide-down">
                  {/* User info */}
                  <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-b border-amber-100 dark:border-amber-900/60">
                    <p className="font-display font-bold text-sm text-gray-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                  </div>
                  
                  {/* Saved Addresses Section */}
                  <div className="border-b border-amber-100 dark:border-amber-900/60">
                    <button
                      onClick={() => setAddressesExpanded(!addressesExpanded)}
                      className="w-full text-left px-4 py-2.5 font-body text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span>📍</span> My Addresses
                      </div>
                      <span className={`text-gray-400 transition-transform ${addressesExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    
                    {addressesExpanded && (
                      <div className="px-2 pb-2 space-y-1">
                        {(addresses || []).length > 0 ? addresses.map((addr) => (
                          <button
                            key={addr.id}
                            onClick={() => { 
                              onAddressClick && onAddressClick(addr)
                              setProfileOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl font-body text-xs transition-colors flex items-start gap-2 ${
                              addr.isDefault 
                                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}
                          >
                            <span className="text-base flex-shrink-0 mt-0.5">
                              {addr.label === 'Home' ? '🏠' : addr.label === 'Office' ? '🏢' : '📍'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{addr.label}</p>
                              <p className="text-[10px] text-gray-400 truncate">{addr.receiverName || user?.name}</p>
                            </div>
                            {addr.isDefault && <span className="text-[8px] bg-amber-200 dark:bg-amber-700 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-200">Default</span>}
                          </button>
                        )) : (
                          <p className="text-xs text-gray-400 px-3 py-2">No saved addresses</p>
                        )}
                        <button
                          onClick={() => { onAddressClick && onAddressClick(); setProfileOpen(false) }}
                          className="w-full text-left px-3 py-2 rounded-xl font-body text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        >
                          ➕ Add New Address
                        </button>
                      </div>
                    )}
                  </div>

                  {[
                    ['🏠', 'Browse Kitchens', '/home'],
                    ['📋', 'My Orders',        '/orders'],
                    ['🛒', 'My Cart',           '/cart'],
                    ['👤', 'My Profile',        '/profile'],
                  ].map(([icon, label, path]) => (
                    <button key={label}
                      onClick={() => { navigate(path); setProfileOpen(false) }}
                      className="w-full text-left px-4 py-2.5 font-body text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-3">
                        <span>{icon}</span>{label}
                    </button>
                  ))}
                  <div className="border-t border-amber-100 dark:border-amber-900/60">
                    <button
                      onClick={() => { logout(); navigate('/'); setProfileOpen(false) }}
                      className="w-full text-left px-4 py-2.5 font-body text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3">
                      <span>🚪</span> Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
