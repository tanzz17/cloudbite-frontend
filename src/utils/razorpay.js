import { paymentAPI } from '../services/api'
export const startRazorpayRedirectCheckout = async ({ orderId }) => {
  const { data } = await paymentAPI.createOrder(orderId)
  if (!data.paymentLinkUrl) throw new Error('Payment link could not be created')
  window.location.assign(data.paymentLinkUrl)
  return true
}
