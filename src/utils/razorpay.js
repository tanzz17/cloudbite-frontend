import { paymentAPI } from '../services/api'

export const redirectToHostedRazorpayPayment = async ({ orderId }) => {
  const { data } = await paymentAPI.createPaymentLink(orderId)
  const paymentLinkUrl = data?.paymentLinkUrl

  if (!paymentLinkUrl) {
    throw new Error('Hosted payment link was not created')
  }

  window.location.assign(paymentLinkUrl)
  return true
}
