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
  PENDING:           { label: 'Pending',           color: 'badge-pending',   icon: '🕐', step: 0 },
  CONFIRMED:         { label: 'Confirmed',          color: 'badge-confirmed', icon: '✅', step: 1 },
  PREPARING:         { label: 'Preparing',          color: 'badge-preparing', icon: '👨‍🍳', step: 2 },
  READY_FOR_PICKUP:  { label: 'Ready',              color: 'badge-ready',     icon: '📦', step: 3 },
  WAITING_FOR_PARTNER: { label: 'Finding Rider',   color: 'badge-pickup',    icon: '🔍', step: 3 },
  PARTNER_ASSIGNED:  { label: 'Rider Assigned',    color: 'badge-pickup',    icon: '🛵', step: 4 },
  HANDOVER:          { label: 'Handover',           color: 'badge-delivery',  icon: '🤝', step: 4 },
  OUT_FOR_DELIVERY:  { label: 'Trip Started',      color: 'badge-delivery',  icon: '🚗', step: 5 },
  PICKED_UP:         { label: 'Picked Up',         color: 'badge-delivery',  icon: '🍔', step: 5 },
  DELIVERED:         { label: 'Delivered',          color: 'badge-delivered', icon: '🎉', step: 6 },
  CANCELLED:         { label: 'Cancelled',          color: 'badge-cancelled', icon: '❌', step: -1 },
}

export const getStatusBadge = (status) => {
  return ORDER_STATUS_CONFIG[status] || { label: status, color: 'badge', icon: '📋', step: 0 }
}

export const TRACKING_STEPS = [
  { key: 'PENDING',          label: 'Order Placed',       icon: '🛒' },
  { key: 'CONFIRMED',        label: 'Confirmed',          icon: '✅' },
  { key: 'PREPARING',        label: 'Preparing',          icon: '👨‍🍳' },
  { key: 'WAITING_FOR_PARTNER', label: 'Finding Rider',  icon: '🔍' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery',  icon: '🛵' },
  { key: 'DELIVERED',        label: 'Delivered',          icon: '🎉' },
]

export const getStepIndex = (status) => {
  const map = {
    PENDING: 0, CONFIRMED: 1, PREPARING: 2,
    READY_FOR_PICKUP: 3, WAITING_FOR_PARTNER: 3,
    PARTNER_ASSIGNED: 4, HANDOVER: 4,
    OUT_FOR_DELIVERY: 5, PICKED_UP: 5, DELIVERED: 6
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
