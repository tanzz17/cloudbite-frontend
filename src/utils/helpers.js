import { format, formatDistanceToNow } from 'date-fns'

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0'
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a')
}

export const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export const ORDER_STATUS_CONFIG = {
  PLACED:             { label: 'Placed',              color: 'badge-pending',   icon: '🛒', step: 0 },
  CONFIRMED:          { label: 'Confirmed',           color: 'badge-confirmed', icon: '✅', step: 1 },
  PREPARING:          { label: 'Preparing',           color: 'badge-preparing', icon: '👨‍🍳', step: 2 },
  READY_FOR_PICKUP:   { label: 'Ready',               color: 'badge-ready',     icon: '📦', step: 3 },
  ACCEPTED:           { label: 'Rider Accepted',      color: 'badge-pickup',    icon: '🛵', step: 4 },
  HEADING_TO_RESTAURANT: { label: 'En Route',        color: 'badge-pickup',    icon: '🛵', step: 5 },
  ARRIVED_AT_RESTAURANT: { label: 'Rider Arrived',    color: 'badge-delivery',  icon: '📍', step: 6 },
  PICKED_UP:          { label: 'Picked Up',          color: 'badge-delivery',  icon: '🍱', step: 7 },
  HEADING_TO_CUSTOMER: { label: 'On the way',       color: 'badge-delivery',  icon: '🚀', step: 8 },
  DELIVERED:          { label: 'Delivered',          color: 'badge-delivered', icon: '🎉', step: 9 },
  CANCELLED:          { label: 'Cancelled',          color: 'badge-cancelled', icon: '❌', step: -1 },
}

export const getStatusBadge = (status) => {
  return ORDER_STATUS_CONFIG[status] || { label: status, color: 'badge', icon: '📋', step: 0 }
}

export const TRACKING_STEPS = [
  { key: 'PLACED',          label: 'Order Placed',       icon: '🛒' },
  { key: 'CONFIRMED',       label: 'Confirmed',          icon: '✅' },
  { key: 'PREPARING',       label: 'Preparing',          icon: '👨‍🍳' },
  { key: 'READY_FOR_PICKUP', label: 'Ready',             icon: '📦' },
  { key: 'ACCEPTED',        label: 'Rider Accepted',     icon: '🛵' },
  { key: 'HEADING_TO_RESTAURANT', label: 'En Route',    icon: '🛵' },
  { key: 'PICKED_UP',       label: 'Picked Up',         icon: '🍱' },
  { key: 'HEADING_TO_CUSTOMER', label: 'On the way',     icon: '🚀' },
  { key: 'DELIVERED',       label: 'Delivered',          icon: '🎉' },
]

export const getStepIndex = (status) => {
  const map = {
    PLACED: 0, CONFIRMED: 1, PREPARING: 2, READY_FOR_PICKUP: 3,
    ACCEPTED: 4, HEADING_TO_RESTAURANT: 5, ARRIVED_AT_RESTAURANT: 6,
    PICKED_UP: 7, HEADING_TO_CUSTOMER: 8, DELIVERED: 9
  }
  return map[status] ?? 0
}

export const truncate = (str, len = 60) => {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}

export const getRoleRoute = (role) => {
  const routes = {
    ADMIN: '/admin',
    KITCHEN_OWNER: '/kitchen',
    CUSTOMER: '/home',
    DELIVERY_PARTNER: '/delivery',
  }
  return routes[role] || '/login'
}
