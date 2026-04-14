import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request interceptor - attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cloudbite_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cloudbite_token')
      localStorage.removeItem('cloudbite_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ==================== AUTH ====================
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

// ==================== ADMIN ====================
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getKitchenOwners: () => api.get('/admin/kitchen-owners'),
  createKitchenOwner: (data) => api.post('/admin/kitchen-owners', data),
  toggleKitchenOwnerStatus: (id) => api.patch(`/admin/kitchen-owners/${id}/toggle-status`),
  updateUserPassword: (id, password) => api.patch(`/admin/users/${id}/password`, { password }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getDeliveryPartners: () => api.get('/admin/delivery-partners'),
  createDeliveryPartner: (data) => api.post('/admin/delivery-partners', data),
  toggleDeliveryPartnerStatus: (id) => api.patch(`/admin/delivery-partners/${id}/toggle-status`),
  getAllKitchens: () => api.get('/admin/kitchens'),
  toggleKitchenStatus: (id) => api.patch(`/admin/kitchens/${id}/toggle-status`),
  deleteKitchen: (id) => api.delete(`/admin/kitchens/${id}`),
  getAllOrders: () => api.get('/admin/orders'),
}

// ==================== KITCHEN ====================
export const kitchenAPI = {
  getProfile: () => api.get('/kitchen/profile'),
  updateProfile: (data) => api.post('/kitchen/profile', data),
  toggleOpen: () => api.patch('/kitchen/toggle-open'),
  getMenu: () => api.get('/kitchen/menu'),
  addMenuItem: (data) => api.post('/kitchen/menu', data),
  updateMenuItem: (id, data) => api.put(`/kitchen/menu/${id}`, data),
  deleteMenuItem: (id) => api.delete(`/kitchen/menu/${id}`),
  toggleItemAvailability: (id) => api.patch(`/kitchen/menu/${id}/toggle-availability`),
  getOrders: () => api.get('/kitchen/orders'),
  confirmOrder: (id) => api.patch(`/kitchen/orders/${id}/confirm`),
  markPreparing: (id) => api.patch(`/kitchen/orders/${id}/preparing`),
  markReady: (id) => api.patch(`/kitchen/orders/${id}/ready`),
  cancelOrder: (id, reason) => api.patch(`/kitchen/orders/${id}/cancel`, { reason }),
  getRevenue: () => api.get('/kitchen/revenue'),
}

// ==================== CUSTOMER ====================
export const customerAPI = {
  getKitchens: (lat, lng) => {
    const params = lat && lng ? `?lat=${lat}&lng=${lng}` : ''
    return api.get(`/customer/kitchens${params}`)
  },
  searchKitchens: (q) => api.get(`/customer/kitchens/search?q=${q}`),
  getKitchen: (id) => api.get(`/customer/kitchens/${id}`),
  getMenu: (kitchenId) => api.get(`/customer/kitchens/${kitchenId}/menu`),
  getCart: () => api.get('/customer/cart'),
  addToCart: (data) => api.post('/customer/cart', data),
  updateCartItem: (cartItemId, quantity) => api.put(`/customer/cart/item/${cartItemId}`, { quantity }),
  clearCart: () => api.delete('/customer/cart'),
  placeOrder: (data) => api.post('/customer/orders', data),
  getOrders: () => api.get('/customer/orders'),
  getOrder: (id) => api.get(`/customer/orders/${id}`),
  cancelOrder: (id, reason) => api.patch(`/customer/orders/${id}/cancel`, { reason }),
  getAddresses: () => api.get('/customer/addresses'),
  getDefaultAddress: () => api.get('/customer/addresses/default'),
  addAddress: (data) => api.post('/customer/addresses', data),
  updateAddress: (id, data) => api.put(`/customer/addresses/${id}`, data),
  setDefaultAddress: (id) => api.patch(`/customer/addresses/${id}/default`),
  deleteAddress: (id) => api.delete(`/customer/addresses/${id}`),
}

// ==================== DELIVERY ====================
export const deliveryAPI = {
  toggleAvailability: () => api.patch('/delivery/availability'),
  getAvailableOrders: () => api.get('/delivery/available-orders'),
  getMyOrders: () => api.get('/delivery/my-orders'),
  acceptOrder: (id) => api.patch(`/delivery/orders/${id}/accept`),
  startTrip: (id) => api.patch(`/delivery/orders/${id}/start-trip`),
  arrived: (id) => api.patch(`/delivery/orders/${id}/arrived`),
  pickedUp: (id) => api.patch(`/delivery/orders/${id}/picked-up`),
  headingToCustomer: (id) => api.patch(`/delivery/orders/${id}/heading-to-customer`),
  markDelivered: (id) => api.patch(`/delivery/orders/${id}/delivered`),
  updateLocation: (data) => api.post('/delivery/location', data),
}

// ==================== TRACKING ====================
export const trackingAPI = {
  updateLocation: (data) => api.post('/tracking/location', data),
  updateStatus: (orderId, status) => api.patch(`/tracking/order/${orderId}/status?status=${status}`),
  getLastLocation: (orderId) => api.get(`/tracking/order/${orderId}/location`),
}

// ==================== PAYMENT ====================
export const paymentAPI = {
  createOrder: (orderId) => api.post(`/customer/orders/${orderId}/payment-link`),
  createPaymentLink: (orderId) => api.post(`/customer/orders/${orderId}/payment-link`),
  syncPaymentStatus: (orderId) => api.post(`/customer/orders/${orderId}/payment-sync`),
  markPaymentFailed: (orderId, reason) => api.post(`/customer/orders/${orderId}/payment-failed`, { reason }),
  verifyPayment: (data) => api.post('/payments/verify', data),
  completeDemoPayment: (orderId) => api.post(`/payments/demo-complete/${orderId}`),
}

// ==================== PUBLIC ====================
export const publicAPI = {
  getKitchens: () => api.get('/public/kitchens'),
  searchKitchens: (q) => api.get(`/public/kitchens/search?q=${q}`),
  getKitchen: (id) => api.get(`/public/kitchens/${id}`),
  getMenu: (id) => api.get(`/public/kitchens/${id}/menu`),
  getPartnerLocation: (partnerId) => api.get(`/public/delivery/${partnerId}/location`),
  getPaymentConfig: () => api.get('/public/payment-config'),
  testRazorpay: () => api.get('/public/test-razorpay'),
}

// ==================== PROFILE ====================
export const profileAPI = {
  updateProfile: (data) => api.put('/profile', data),
  changePassword: (data) => api.put('/profile/password', data),
}

export default api
