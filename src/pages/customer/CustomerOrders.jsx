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
  PARTNER_ASSIGNED:     { step:4, label:'Rider Assigned',     icon:'🛵', color:'text-indigo-600', bg:'bg-indigo-50 dark:bg-indigo-900/20',  desc:'Your rider has accepted the order.' },
  HANDOVER:             { step:4, label:'Handover',          icon:'🤝', color:'text-indigo-600', bg:'bg-indigo-50 dark:bg-indigo-900/20',  desc:'Food handed to rider at kitchen.' },
  OUT_FOR_DELIVERY:     { step:5, label:'Trip Started',      icon:'🛵', color:'text-blue-600',   bg:'bg-blue-50 dark:bg-blue-900/20',      desc:'Your rider has started the trip!' },
  PICKED_UP:            { step:5, label:'Picked Up',          icon:'🍔', color:'text-green-600',  bg:'bg-green-50 dark:bg-green-900/20',    desc:'Your food has been picked up!' },
  DELIVERED:            { step:6, label:'Delivered',          icon:'🎉', color:'text-green-700',  bg:'bg-green-50 dark:bg-green-900/20',    desc:'Order delivered! Enjoy your meal.' },
  CANCELLED:            { step:-1, label:'Cancelled',         icon:'❌', color:'text-red-600',    bg:'bg-red-50 dark:bg-red-900/20',        desc:'Order was cancelled.' },
}

const STEPS = ['Order Placed','Confirmed','Preparing','Finding Rider','Rider Assigned','Out for Delivery','Delivered']

// ── Live Map with Leaflet ─────────────────────────────────────────────────────
const LiveMap = ({ order, partnerLocation, signalLost }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const riderMarkerRef = useRef(null)
  const routeLineRef = useRef(null)
  const prevLocationRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  // Kitchen location (simulated - in real app would come from order)
  const kitchenLocation = order?.kitchen?.latitude && order?.kitchen?.longitude
    ? { lat: order.kitchen.latitude, lng: order.kitchen.longitude }
    : null

  // Customer location from delivery address
  const customerLocation = order?.deliveryLatitude && order?.deliveryLongitude
    ? { lat: order.deliveryLatitude, lng: order.deliveryLongitude }
    : null

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    const initMap = async () => {
      const L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')

      // Default center (Pune, Maharashtra)
      const center = customerLocation || kitchenLocation || { lat: 18.5204, lng: 73.8567 }

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([center.lat, center.lng], 14)

      // Dark/light tile layer
      const isDark = document.documentElement.classList.contains('dark')
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

      L.tileLayer(tileUrl, {
        maxZoom: 19,
      }).addTo(map)

      // Add zoom control to bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      mapInstanceRef.current = map

      // Create custom icons
      const kitchenIcon = L.divIcon({
        html: `<div style="background: linear-gradient(135deg, #f59e0b, #ea580c); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); border: 3px solid white;">
          <span style="font-size: 18px;">🍽️</span>
        </div>`,
        className: 'custom-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const customerIcon = L.divIcon({
        html: `<div style="background: linear-gradient(135deg, #22c55e, #16a34a); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4); border: 3px solid white;">
          <span style="font-size: 18px;">🏠</span>
        </div>`,
        className: 'custom-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const riderIcon = L.divIcon({
        html: `<div style="background: linear-gradient(135deg, #f97316, #ea580c); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(249, 115, 22, 0.5); border: 3px solid white; animation: pulse-rider 1.5s ease-in-out infinite;">
          <span style="font-size: 22px;">🛵</span>
        </div>
        <style>
          @keyframes pulse-rider {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>`,
        className: 'custom-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      })

      // Add kitchen marker
      if (kitchenLocation) {
        L.marker([kitchenLocation.lat, kitchenLocation.lng], { icon: kitchenIcon })
          .addTo(map)
          .bindPopup('<b>Cloud Kitchen</b><br/>Pickup Location')
      }

      // Add customer marker
      if (customerLocation) {
        L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
          .addTo(map)
          .bindPopup('<b>Delivery Location</b><br/>Your Address')

        // Fit bounds to show both points
        if (kitchenLocation) {
          const bounds = L.latLngBounds([
            [kitchenLocation.lat, kitchenLocation.lng],
            [customerLocation.lat, customerLocation.lng],
          ])
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      }

      // Create rider marker (initially hidden)
      if (partnerLocation && !signalLost) {
        riderMarkerRef.current = L.marker([partnerLocation.lat, partnerLocation.lng], { icon: riderIcon })
          .addTo(map)
          .bindPopup('<b>Your Rider</b><br/>On the way!')
      }

      setMapReady(true)
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update rider position
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return

    const updateRiderPosition = async () => {
      const L = await import('leaflet')

      if (!partnerLocation || signalLost) {
        if (riderMarkerRef.current) {
          mapInstanceRef.current.removeLayer(riderMarkerRef.current)
          riderMarkerRef.current = null
        }
        return
      }

      const riderIcon = L.divIcon({
        html: `<div style="background: linear-gradient(135deg, #f97316, #ea580c); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(249, 115, 22, 0.5); border: 3px solid white;">
          <span style="font-size: 22px;">🛵</span>
        </div>`,
        className: 'custom-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      })

      if (riderMarkerRef.current) {
        // Animate to new position
        riderMarkerRef.current.setLatLng([partnerLocation.lat, partnerLocation.lng])
      } else {
        // Create new marker
        riderMarkerRef.current = L.marker([partnerLocation.lat, partnerLocation.lng], { icon: riderIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('<b>Your Rider</b><br/>On the way!')
      }

      // Draw/update route line
      if (routeLineRef.current) {
        mapInstanceRef.current.removeLayer(routeLineRef.current)
      }

      // Draw path from kitchen to rider to customer
      const points = []
      if (kitchenLocation) points.push([kitchenLocation.lat, kitchenLocation.lng])
      points.push([partnerLocation.lat, partnerLocation.lng])
      if (customerLocation) points.push([customerLocation.lat, customerLocation.lng])

      if (points.length >= 2) {
        routeLineRef.current = L.polyline(points, {
          color: '#f97316',
          weight: 4,
          opacity: 0.8,
          dashArray: '10, 10',
        }).addTo(mapInstanceRef.current)
      }

      // Smooth pan to rider
      mapInstanceRef.current.panTo([partnerLocation.lat, partnerLocation.lng], { animate: true })

      prevLocationRef.current = partnerLocation
    }

    updateRiderPosition()
  }, [partnerLocation, signalLost, mapReady, kitchenLocation, customerLocation])

  // Draw full route when delivered
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || order?.status !== 'DELIVERED') return

    const drawFullRoute = async () => {
      const L = await import('leaflet')

      // Final route line
      if (kitchenLocation && customerLocation) {
        if (routeLineRef.current) {
          mapInstanceRef.current.removeLayer(routeLineRef.current)
        }

        routeLineRef.current = L.polyline([
          [kitchenLocation.lat, kitchenLocation.lng],
          [customerLocation.lat, customerLocation.lng],
        ], {
          color: '#22c55e',
          weight: 4,
          opacity: 0.9,
        }).addTo(mapInstanceRef.current)

        const bounds = L.latLngBounds([
          [kitchenLocation.lat, kitchenLocation.lng],
          [customerLocation.lat, customerLocation.lng],
        ])
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
      }
    }

    drawFullRoute()
  }, [order?.status, mapReady])

  return (
    <div className="relative rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-800">
      <div ref={mapRef} className="w-full h-64 bg-gray-100 dark:bg-gray-800" />
      
      {/* Signal Lost Overlay */}
      {signalLost && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-[1000]">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Signal Lost — Rider location unavailable
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg z-[1000]">
        <div className="flex items-center gap-4 text-xs font-body">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
            <span className="text-gray-600 dark:text-gray-300">Kitchen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500" />
            <span className="text-gray-600 dark:text-gray-300">You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-500" />
            <span className="text-gray-600 dark:text-gray-300">Rider</span>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      {!signalLost && partnerLocation && (
        <div className="absolute top-3 right-3 bg-green-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg z-[1000]">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      )}

      {/* Empty state */}
      {!partnerLocation && !signalLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-800/80">
          <div className="text-center">
            <div className="text-4xl mb-2 animate-bounce">🛵</div>
            <p className="font-body text-sm text-gray-500">Waiting for rider to start...</p>
          </div>
        </div>
      )}
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
  const isActive = ['PARTNER_ASSIGNED','OUT_FOR_DELIVERY','PICKED_UP'].includes(order.status)
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
