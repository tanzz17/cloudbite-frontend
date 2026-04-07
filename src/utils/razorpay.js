import { paymentAPI } from '../services/api'

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

export const openRazorpayCheckout = async ({ orderId, user, onSuccess }) => {
  await ensureRazorpayLoaded()
  const { data } = await paymentAPI.createOrder(orderId)

  return new Promise((resolve, reject) => {
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
      handler: async (response) => {
        try {
          await paymentAPI.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderId,
          })
          await onSuccess?.()
          resolve(true)
        } catch {
          reject(new Error('Payment verification failed'))
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    })

    rzp.on('payment.failed', () => reject(new Error('Payment failed. Please try again.')))
    rzp.open()
  })
}
