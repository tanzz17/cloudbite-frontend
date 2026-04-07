import { paymentAPI } from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const ensureRazorpayLoaded = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve(true)
    return
  }

  const existing = document.querySelector('script[data-razorpay-checkout="true"]')
  if (existing) {
    existing.addEventListener('load', () => resolve(true), { once: true })
    existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout')), { once: true })
    return
  }

  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.async = true
  script.dataset.razorpayCheckout = 'true'
  script.onload = () => resolve(true)
  script.onerror = () => reject(new Error('Unable to load Razorpay checkout'))
  document.body.appendChild(script)
})

export const startRazorpayRedirectCheckout = async ({ orderId, user }) => {
  await ensureRazorpayLoaded()
  const { data } = await paymentAPI.createOrder(orderId)

  const rzp = new window.Razorpay({
    key: data.keyId,
    amount: Math.round(Number(data.amount) * 100),
    currency: data.currency || 'INR',
    name: 'CloudBite',
    description: `Order ${data.orderNumber || ''}`.trim(),
    order_id: data.razorpayOrderId,
    prefill: {
      name: data.customerName || user?.name || '',
      email: data.customerEmail || user?.email || '',
      contact: data.customerPhone || user?.phone || '',
    },
    theme: { color: '#f97316' },
    callback_url: `${API_BASE}/api/payments/callback?order_id=${orderId}`,
    redirect: true,
  })

  rzp.open()
  return true
}
