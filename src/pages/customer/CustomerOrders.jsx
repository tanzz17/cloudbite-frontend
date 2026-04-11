import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers'
import { useWebSocket } from '../../hooks/useWebSocket'
import toast from 'react-hot-toast'

// ── Order status configuration ───────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:              { step:0, label:'Order Placed',       icon:'🛒', color:'text-yellow-600', bg:'bg-yellow-50 dark:bg-yellow-900/20',  desc:'Your order has been received by the kitchen.' },
  PAYMENT_FAILED:       { step:-1, label:'Payment Failed',    icon:'💳', color:'text-red-600',    bg:'bg-red-50 dark:bg-red-900/20',        desc:'Payment was not completed. Your order has not been placed.' },
  CONFIRMED:            { step:1, label:'Confirmed',          icon:'✅', color:'text-blue-600',   bg:'bg-blue-50 dark:bg-blue-900/20',      desc:'Kitchen has confirmed your order.' },
  PREPARING:            { step:2, label:'Preparing',          icon:'👨‍🍳', color:'text-purple-600', bg:'bg-purple-50 dark:bg-purple-900/20',  desc:'Your food is being freshly prepared.' },
  READY_FOR_PICKUP:     { step:3, label:'Ready for Pickup',   icon:'📦', color:'text-orange-600', bg:'bg-orange-50 dark:bg-orange-900/20',  desc:'Food is ready. Finding a delivery partner.' },
  WAITING_FOR_PARTNER:  { step:3, label:'Finding Rider',      icon:'🔍', color:'text-orange-600', bg:'bg-orange-50 dark:bg-orange-900/20',  desc:'Looking for an available delivery partner.' },
  PARTNER_ASSIGNED:     { step:4, label:'Rider Assigned',     icon:'🛵', color:'text-indigo-600', bg:'bg-indigo-50 dark:bg-indigo-900/20',  desc:'A delivery partner has been assigned to your order.' },
  HANDOVER:             { step:4, label:'Picked Up',          icon:'🤝', color:'text-indigo-600', bg:'bg-indigo-50 dark:bg-indigo-900/20',  desc:'Order has been picked up by the rider.' },
  OUT_FOR_DELIVERY:     { step:5, label:'Out for Delivery',   icon:'🛵', color:'text-green-600',  bg:'bg-green-50 dark:bg-green-900/20',    desc:'Your rider is on the way to you!' },
  DELIVERED:            { step:6, label:'Delivered',          icon:'🎉', color:'text-green-700',  bg:'bg-green-50 dark:bg-green-900/20',    desc:'Order delivered! Enjoy your meal.' },
  CANCELLED:            { step:-1, label:'Cancelled',         icon:'❌', color:'text-red-600',    bg:'bg-red-50 dark:bg-red-900/20',        desc:'Order was cancelled.' },
}

const STEPS = ['Order Placed','Confirmed','Preparing','Finding Rider','Rider Assigned','Out for Delivery','Delivered']

// ── Animated GPS Map Component ───────────────────────────────────────────────
const LiveMap = ({ order, partnerLocation, signalLost }) => {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const dotRef    = useRef({ x: 0.3, y: 0.6 })

  // Animate rider dot smoothly
  useEffect(() => {
    if (!partnerLocation || !canvasRef.current) return
    const targetX = 0.3 + Math.random() * 0.4
    const targetY = 0.3 + Math.random() * 0.4
    dotRef.current = { x: targetX, y: targetY }
  }, [partnerLocation])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame = 0

    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Background grid (map-like)
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.08)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Road lines
      ctx.strokeStyle = 'rgba(209, 213, 219, 0.5)'
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      // Horizontal road
      ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5); ctx.stroke()
      // Vertical road
      ctx.beginPath(); ctx.moveTo(W * 0.4, 0); ctx.lineTo(W * 0.4, H); ctx.stroke()
      // Diagonal road
      ctx.beginPath(); ctx.moveTo(0, H * 0.2); ctx.lineTo(W * 0.4, H * 0.5); ctx.stroke()

      // Road dashes
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 10])
      ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5); ctx.stroke()
      ctx.setLineDash([])

      // Destination marker (home)
      const destX = W * 0.78, destY = H * 0.3
      ctx.fillStyle = '#ef4444'
      ctx.beginPath(); ctx.arc(destX, destY, 12, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'white'
      ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('🏠', destX, destY)
      // Ping animation
      const ping = Math.abs(Math.sin(frame * 0.05))
      ctx.strokeStyle = `rgba(239,68,68,${0.4 - ping * 0.3})`
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(destX, destY, 12 + ping * 16, 0, Math.PI * 2); ctx.stroke()

      // Kitchen marker
      const kitX = W * 0.18, kitY = H * 0.65
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath(); ctx.arc(kitX, kitY, 10, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'white'; ctx.font = '12px serif'
      ctx.fillText('🍽️', kitX, kitY)

      // Route line
      const rx = dotRef.current.x * W, ry = dotRef.current.y * H
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)'
      ctx.lineWidth = 3; ctx.setLineDash([6, 4])
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(destX, destY); ctx.stroke()
      ctx.setLineDash([])

      // Rider dot
      if (!signalLost) {
        // Glow
        const grd = ctx.createRadialGradient(rx, ry, 0, rx, ry, 20)
        grd.addColorStop(0, 'rgba(245,158,11,0.4)')
        grd.addColorStop(1, 'transparent')
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(rx, ry, 20, 0, Math.PI * 2); ctx.fill()
        // Dot
        ctx.fillStyle = '#f59e0b'
        ctx.beginPath(); ctx.arc(rx, ry, 10, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'white'; ctx.font = '12px serif'
        ctx.fillText('🛵', rx, ry)
      } else {
        // Signal lost — blinking
        if (Math.floor(frame / 15) % 2 === 0) {
          ctx.fillStyle = '#9ca3af'
          ctx.beginPath(); ctx.arc(rx, ry, 10, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = 'white'; ctx.font = '11px serif'
          ctx.fillText('?', rx, ry)
        }
      }

      frame++
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [signalLost])

  return (
    <div className="relative rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-800">
      <canvas ref={canvasRef} width={500} height={220}
        className="w-full h-48 bg-[#fdf8f0] dark:bg-[#1a1108]" />
      {signalLost && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-800/90 text-white text-xs font-body px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Weak GPS signal — last known location shown
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/90 dark:bg-[#1a1108]/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-body">
        <span className={`w-2 h-2 rounded-full ${signalLost ? 'bg-red-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
        {signalLost ? 'GPS Weak' : 'Live Tracking'}
        {partnerLocation && !signalLost && (
          <span className="text-gray-400 ml-1">📍 {partnerLocation.lat?.toFixed(4)}, {partnerLocation.lng?.toFixed(4)}</span>
        )}
      </div>
    </div>
  )
}

// ── ETA countdown ────────────────────────────────────────────────────────────
const ETATimer = ({ minutes }) => {
  const [remaining, setRemaining] = useState(minutes * 60)
  useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(remaining / 60), s = remaining % 60
  return (
    <div className="flex items-center gap-2">
      <span className="font-display font-bold text-2xl text-amber-600 dark:text-amber-400 tabular-nums">
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
      <span className="text-xs font-body text-gray-500">remaining</span>
    </div>
  )
}

// ── Orders List ──────────────────────────────────────────────────────────────
export function CustomerOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    customerAPI.getOrders().then(r => setOrders(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [])

  const cfg = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.PENDING

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-6">My Orders 📋</h1>
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-amber-50 dark:bg-amber-900/10 animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <p className="font-display text-xl font-bold text-gray-700 dark:text-gray-300">No orders yet</p>
          <p className="font-body text-gray-500 mt-2">Place your first order!</p>
          <Link to="/home" className="inline-block mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all">Browse Kitchens</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const c = cfg(order.status)
            return (
              <Link to={`/orders/${order.id}`} key={order.id}
                className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center text-2xl flex-shrink-0`}>{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{order.orderNumber}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.color}`}>{c.label}</span>
                  </div>
                  <p className="font-display font-bold text-gray-900 dark:text-white truncate mt-0.5">{order.kitchen?.name}</p>
                  <p className="text-xs font-body text-gray-500">{order.items?.length} items · {formatCurrency(order.totalAmount)} · {timeAgo(order.createdAt)}</p>
                </div>
                <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">›</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Order Detail — Swiggy/Zomato style ──────────────────────────────────────
export function OrderDetail() {
  const { orderId } = useParams()
  const navigate    = useNavigate()
  const [order, setOrder]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [partnerLocation, setPartnerLoc] = useState(null)
  const [signalLost, setSignalLost]     = useState(false)
  const signalTimer = useRef(null)

  const fetchOrder = useCallback(async () => {
    try { const { data } = await customerAPI.getOrder(orderId); setOrder(data) }
    catch { toast.error('Order not found'); navigate('/orders') }
    finally { setLoading(false) }
  }, [orderId])

  useEffect(() => { fetchOrder() }, [])

  // WebSocket: real-time status + GPS
  useWebSocket(order ? [
    {
      topic: `/topic/order/${orderId}/status`,
      callback: (msg) => {
        setOrder(prev => prev ? { ...prev, status: msg.status } : prev)
        const c = STATUS_CONFIG[msg.status]
        if (c) toast(c.desc, { icon: c.icon })
      },
    },
    {
      topic: `/topic/order/${orderId}/location`,
      callback: (loc) => {
        setPartnerLoc({ lat: loc.lat, lng: loc.lng })
        setSignalLost(false)
        clearTimeout(signalTimer.current)
        // If no update in 15s, mark signal weak
        signalTimer.current = setTimeout(() => setSignalLost(true), 15000)
      },
    },
  ] : [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center"><div className="text-5xl mb-3 animate-bounce-soft">🛵</div><p className="font-hand text-amber-600 text-xl">Fetching your order...</p></div>
    </div>
  )
  if (!order) return null

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
  const currentStep = cfg.step
  const isActive = ['PARTNER_ASSIGNED','HANDOVER','OUT_FOR_DELIVERY'].includes(order.status)
  const isDelivered = order.status === 'DELIVERED'
  const isCancelled = order.status === 'CANCELLED'
  const isPaymentFailed = order.status === 'PAYMENT_FAILED'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-10">

      {/* ── HERO STATUS CARD ─────────────────────────────── */}
      <div className={`relative rounded-3xl overflow-hidden p-6 mb-4 ${cfg.bg} border border-amber-200 dark:border-amber-800`}>
        <div className="flex items-center gap-4">
          <div className="text-5xl animate-bounce-soft">{cfg.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">{order.orderNumber}</p>
            <h2 className={`font-display text-2xl font-bold ${cfg.color}`}>{cfg.label}</h2>
            <p className="font-body text-sm text-gray-600 dark:text-gray-400 mt-0.5">{cfg.desc}</p>
          </div>
          {isActive && order.estimatedDeliveryTime && (
            <ETATimer minutes={order.estimatedDeliveryTime} />
          )}
        </div>

        {/* Delivery partner strip */}
        {order.deliveryPartner && isActive && (
          <div className="mt-4 flex items-center gap-3 bg-white/70 dark:bg-[#1a1108]/70 backdrop-blur-sm rounded-2xl p-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {order.deliveryPartner.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-bold text-sm text-gray-900 dark:text-white">{order.deliveryPartner.name}</p>
              <p className="text-xs text-gray-500 font-body flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${signalLost ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                {signalLost ? 'Weak signal' : 'Live tracking active'}
              </p>
            </div>
            <a href={`tel:${order.deliveryPartner.phone}`}
              className="flex items-center gap-1.5 bg-green-500 text-white font-body font-bold text-xs px-3 py-2 rounded-xl hover:bg-green-600 transition-colors">
              📞 Call
            </a>
          </div>
        )}
      </div>

      {/* ── LIVE GPS MAP ─────────────────────────────────── */}
      {isActive && (
        <div className="mb-4">
          <p className="font-display font-bold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            🗺️ Live Location
            {!signalLost && <span className="text-[10px] font-body text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>}
          </p>
          <LiveMap order={order} partnerLocation={partnerLocation} signalLost={signalLost} />
        </div>
      )}

      {/* ── PROGRESS TRACKER ─────────────────────────────── */}
      {!isCancelled && (
        <div className="bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40 p-4 mb-4">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4 text-sm">Order Progress</h3>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-amber-100 dark:bg-amber-900/40" />
            <div
              className="absolute left-4 top-4 w-0.5 bg-gradient-to-b from-amber-400 to-orange-500 transition-all duration-700"
              style={{ height: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />
            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const done   = i < currentStep
                const active = i === currentStep
                return (
                  <div key={step} className="flex items-center gap-4 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-500 ${
                      done   ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-400/40' :
                      active ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/50 ring-4 ring-amber-200 dark:ring-amber-800 animate-pulse' :
                               'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-900/40'
                    }`}>
                      <span className={`text-sm ${done || active ? 'text-white' : 'text-amber-300'}`}>
                        {done ? '✓' : Object.values(STATUS_CONFIG).find(c => c.step === i)?.icon || '⏱️'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-body font-bold text-sm ${active ? 'text-amber-600 dark:text-amber-400' : done ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {step}
                      </p>
                      {active && <p className="text-xs font-body text-gray-500 dark:text-gray-400 mt-0.5">{cfg.desc}</p>}
                    </div>
                    {active && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Now</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── DELIVERED CELEBRATION ────────────────────────── */}
      {isDelivered && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-5 mb-4 text-center">
          <div className="text-5xl mb-2">🎉</div>
          <h3 className="font-display font-bold text-green-700 dark:text-green-400 text-lg">Order Delivered!</h3>
          <p className="font-body text-sm text-gray-600 dark:text-gray-400 mt-1">Delivered at {formatDate(order.deliveredAt)}</p>
          <p className="font-hand text-green-600 dark:text-green-400 text-lg mt-2">आपल्या घरचं जेवण 🏠 Enjoy your meal!</p>
        </div>
      )}

      {/* ── CANCELLED ────────────────────────────────────── */}
      {isCancelled && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-4 mb-4 text-center">
          <div className="text-4xl mb-2">❌</div>
          <p className="font-display font-bold text-red-600">Order Cancelled</p>
          {order.cancellationReason && <p className="text-xs font-body text-gray-500 mt-1">Reason: {order.cancellationReason}</p>}
        </div>
      )}

      {/* ── PAYMENT FAILED ────────────────────────────────── */}
      {isPaymentFailed && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-5 mb-4 text-center">
          <div className="text-5xl mb-3">💳</div>
          <h3 className="font-display font-bold text-red-600 text-lg">Payment Failed</h3>
          <p className="font-body text-sm text-gray-600 dark:text-gray-400 mt-2">
            Your payment was not completed successfully.<br />
            Your order has <strong>not been placed</strong>. Please try again later.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all">
            Browse Kitchens
          </button>
        </div>
      )}

      {/* ── ORDER ITEMS ──────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40 overflow-hidden mb-4">
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40">
          <p className="font-display font-bold text-sm text-gray-900 dark:text-white">Order from {order.kitchen?.name}</p>
        </div>
        <div className="divide-y divide-amber-50 dark:divide-amber-900/20">
          {order.items?.map(item => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-amber-600 dark:text-amber-400 font-bold w-5">{item.quantity}×</span>
                <span className="font-body text-sm text-gray-700 dark:text-gray-300">{item.itemName}</span>
              </div>
              <span className="font-body font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-900/40 space-y-1.5 text-sm font-body">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></div>
          <div className="flex justify-between text-gray-500"><span>GST</span><span>{formatCurrency(order.tax)}</span></div>
          <div className="flex justify-between font-display font-bold text-gray-900 dark:text-white text-base pt-1 border-t border-amber-200 dark:border-amber-800">
            <span>Total</span><span className="text-amber-600">{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* ── DELIVERY INFO ────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1a1108] rounded-2xl border border-amber-100 dark:border-amber-900/40 p-4">
        <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white mb-3">Delivery Details</h3>
        <div className="space-y-2 text-sm font-body text-gray-600 dark:text-gray-400">
          <p className="flex items-start gap-2"><span className="flex-shrink-0">📍</span>{order.deliveryAddress}</p>
          <p className="flex items-center gap-2"><span>💳</span>{order.paymentMethod}
            <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full ${order.paymentStatus === 'COMPLETED' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
              {order.paymentStatus}
            </span>
          </p>
          <p className="flex items-center gap-2"><span>📅</span>Placed {formatDate(order.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}
