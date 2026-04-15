import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { customerAPI, trackingAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';

const BASE = import.meta.env.VITE_API_URL || 'https://cloudbite-backend-msab.onrender.com';

const DEMO_MODE = true;

async function fetchRoute(from, to) {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson&steps=true`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.routes?.length) return null;
    const route = d.routes[0];
    return {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      eta: Math.ceil(route.duration / 60),
      totalDuration: route.duration,
      totalDistance: route.distance,
      steps: route.legs[0].steps,
    };
  } catch {
    return null;
  }
}

const ALL_STEPS = [
  { key: 'PLACED', label: 'Order Placed', icon: '🛒' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
  { key: 'PREPARING', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'READY_FOR_PICKUP', label: 'Ready', icon: '📦' },
  { key: 'ACCEPTED', label: 'Rider Accepted', icon: '🤝' },
  { key: 'HEADING_TO_RESTAURANT', label: 'En Route', icon: '🛵', sub: 'Rider is heading to restaurant.' },
  { key: 'ARRIVED_AT_RESTAURANT', label: 'Arrived', icon: '📍', sub: 'Rider is at the restaurant.' },
  { key: 'PICKED_UP', label: 'Picked Up', icon: '🍱', sub: 'Food picked up!' },
  { key: 'HEADING_TO_CUSTOMER', label: 'On the way', icon: '🚀', sub: 'Rider is heading to you!' },
  { key: 'DELIVERED', label: 'Delivered', icon: '🎉', sub: 'Enjoy your meal!' },
];

const STEP_INDEX = Object.fromEntries(ALL_STEPS.map((s, i) => [s.key, i]));

const BANNER = {
  PLACED: { label: 'Order Placed', color: '#64748b', sub: 'Waiting for kitchen to confirm.' },
  CONFIRMED: { label: 'Order Confirmed', color: '#f59e0b', sub: 'Kitchen has accepted your order.' },
  PREPARING: { label: 'Being Prepared', color: '#f59e0b', sub: 'Chef is cooking your food.' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', color: '#10b981', sub: 'Waiting for a rider to accept.' },
  ACCEPTED: { label: 'Rider Accepted', color: '#3b82f6', sub: 'Rider is on their way to restaurant.' },
  HEADING_TO_RESTAURANT: { label: 'Rider En Route', color: '#f97316', sub: 'Rider is heading to restaurant.' },
  ARRIVED_AT_RESTAURANT: { label: 'Rider at Restaurant', color: '#f97316', sub: 'Rider arrived, picking up food.' },
  PICKED_UP: { label: 'Food Picked Up!', color: '#8b5cf6', sub: 'Rider heading your way.' },
  HEADING_TO_CUSTOMER: { label: 'At Your Location!', color: '#10b981', sub: 'Rider has arrived at your address.' },
  DELIVERED: { label: 'Delivered 🎉', color: '#10b981', sub: 'Enjoy your meal!' },
};

const GPS_ACTIVE_STATUSES = new Set([
  'ACCEPTED', 'HEADING_TO_RESTAURANT', 'ARRIVED_AT_RESTAURANT', 'PICKED_UP', 'HEADING_TO_CUSTOMER',
]);

const makeRiderIcon = (bearing = 0) => L.divIcon({
  className: '',
  html: `<div style="width:38px;height:38px;background:#f97316;border-radius:50% 50% 50% 4px;border:3px solid #fff;transform:rotate(${bearing - 45}deg);box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:16px;"><span style="transform:rotate(${45 - bearing}deg)">🛵</span></div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const restaurantIcon = L.divIcon({
  className: '',
  html: `<div style="background:#fff;border-radius:50%;padding:5px;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:20px;line-height:1">🍽️</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const homeIcon = L.divIcon({
  className: '',
  html: `<div style="background:#fff;border-radius:50%;padding:5px;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:20px;line-height:1">🏠</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const pausedIcon = L.divIcon({
  className: '',
  html: `<div style="width:38px;height:38px;background:#ef4444;border-radius:50% 50% 50% 4px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:16px;">🛑</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

function MapPanner({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true, duration: 0.7 });
  }, [position, map]);
  return null;
}

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [riderPosition, setRiderPosition] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [route, setRoute] = useState(null);
  const [eta, setEta] = useState(null);
  const [nextStep, setNextStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [demoRoute, setDemoRoute] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const stompRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const pauseStateRef = useRef({ isPaused: false, pauseEndTime: 0, pauseProcessed: false });

  useEffect(() => {
    if (!orderId) return;

    const fetchAll = async () => {
      try {
        const { data: ord } = await customerAPI.getOrder(orderId);
        setOrder(ord);
        setLiveStatus(ord.status);
        console.log('Order loaded:', ord);
      } catch (err) {
        console.error('Failed to fetch order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || DEMO_MODE) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BASE}/ws`),
      reconnectDelay: 4000,
      onConnect: () => {
        setWsConnected(true);
        client.subscribe(`/topic/order/${orderId}/location`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.latitude && data.longitude) {
            setRiderPosition([data.latitude, data.longitude]);
            setBearing(data.bearing ?? 0);
          }
          if (data.orderStatus) setLiveStatus(data.orderStatus);
        });
        client.subscribe(`/topic/order/${orderId}/status`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.status) setLiveStatus(data.status);
        });
      },
      onDisconnect: () => setWsConnected(false),
    });

    client.activate();
    stompRef.current = client;

    return () => { client.deactivate(); };
  }, [orderId]);

  // Demo mode - simulate rider moving along the route with realistic speed
  useEffect(() => {
    if (!DEMO_MODE || !order || !liveStatus) return;

    const kitchenLoc = order.kitchen ? { lat: order.kitchen.latitude, lng: order.kitchen.longitude } : null;
    const customerLoc = order.deliveryLatitude ? { lat: order.deliveryLatitude, lng: order.deliveryLongitude } : null;

    if (!kitchenLoc || !customerLoc) return;

    const isGoingToRestaurant = liveStatus === 'HEADING_TO_RESTAURANT' || liveStatus === 'ACCEPTED';
    const isGoingToCustomer = liveStatus === 'PICKED_UP' || liveStatus === 'HEADING_TO_CUSTOMER';

    if (!isGoingToRestaurant && !isGoingToCustomer) {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      return;
    }

    const from = isGoingToRestaurant ? customerLoc : kitchenLoc;
    const to = isGoingToRestaurant ? kitchenLoc : customerLoc;

    fetchRoute(from, to).then((r) => {
      if (r && r.coords && r.coords.length > 0) {
        const totalDuration = r.totalDuration || r.eta * 60;
        const totalDistance = r.totalDistance || r.coords.length * 10;
        
        const speedMetersPerSecond = totalDistance / totalDuration;
        
        const route = r.coords;
        setDemoRoute(route);
        setRoute(route);
        setEta(r.eta);
        setNextStep(r.steps?.[0] ?? null);

        const stepInterval = 400;
        let currentIndex = 0;
        const totalSteps = route.length;
        const baseEta = r.eta;
        let pauseCount = 0;
        const maxPauses = 2;
        
        const moveStep = () => {
          if (currentIndex >= route.length - 1) {
            setRiderPosition(route[route.length - 1]);
            setEta(0);
            setIsPaused(false);
            if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
            return;
          }

          if (pauseStateRef.current.isPaused) {
            if (Date.now() < pauseStateRef.current.pauseEndTime) {
              return;
            } else {
              pauseStateRef.current.isPaused = false;
              setIsPaused(false);
            }
          }

          const shouldPause = currentIndex > 5 && currentIndex < totalSteps - 5 && pauseCount < maxPauses && Math.random() < 0.2;
          
          if (shouldPause) {
            pauseCount++;
            pauseStateRef.current.isPaused = true;
            pauseStateRef.current.pauseEndTime = Date.now() + 10000;
            setIsPaused(true);
            return;
          }

          currentIndex++;
          const newPos = route[currentIndex];
          setRiderPosition(newPos);

          if (currentIndex > 0) {
            const prevPos = route[currentIndex - 1];
            const b = calculateBearing(prevPos, newPos);
            setBearing(b);
          }

          const progress = currentIndex / totalSteps;
          const newEta = Math.max(1, Math.ceil(baseEta * (1 - progress)));
          setEta(newEta);
        };

        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);

        demoIntervalRef.current = setInterval(moveStep, stepInterval);
      }
    });

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
    };
  }, [order, liveStatus]);

  useEffect(() => {
    if (DEMO_MODE || !riderPosition || !order) return;

    const rider = { lat: riderPosition[0], lng: riderPosition[1] };
    const pickedUp = ['PICKED_UP', 'HEADING_TO_CUSTOMER'].includes(liveStatus);
    const dest = pickedUp
      ? { lat: order.deliveryLatitude, lng: order.deliveryLongitude }
      : { lat: order.kitchen?.latitude, lng: order.kitchen?.longitude };

    if (!dest?.lat || !dest?.lng) return;

    fetchRoute(rider, dest).then((r) => {
      if (r) {
        setRoute(r.coords);
        setEta(r.eta);
        setNextStep(r.steps?.[0] ?? null);
      }
    });
  }, [riderPosition, liveStatus, order]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">🛵</div>
        <p className="text-amber-600 text-xl">Loading your order...</p>
      </div>
    </div>
  );

  if (!order) return (
    <div className="text-center p-8">
      <p className="text-red-500">Order not found</p>
      <button onClick={() => navigate(-1)} className="mt-4 bg-amber-500 text-white px-4 py-2 rounded-lg">Go Back</button>
    </div>
  );

  const banner = BANNER[liveStatus] ?? BANNER['PLACED'];
  const currentStep = STEP_INDEX[liveStatus] ?? 0;
  const showGPS = riderPosition && GPS_ACTIVE_STATUSES.has(liveStatus);

  const mapCenter = riderPosition
    ?? (order.kitchen?.latitude ? [order.kitchen.latitude, order.kitchen.longitude] : [18.5204, 73.8567]);

  return (
    <div className="max-w-lg mx-auto bg-gray-50 min-h-screen pb-8">
      {DEMO_MODE && (
        <div className="bg-blue-100 text-blue-700 text-xs px-4 py-2 text-center">
          🎓 Demo Mode - Simulated delivery tracking
        </div>
      )}

      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-600">← Back</button>
        <span className="flex-1 font-bold">Order #{order.orderNumber}</span>
        {!DEMO_MODE && (
          <span className={`text-xs px-2 py-1 rounded-full ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {wsConnected ? '● Live' : '○'}
          </span>
        )}
      </div>

      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 border-l-4 shadow-sm" style={{ borderLeftColor: banner.color }}>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ background: banner.color }} />
          <div>
            <p className="font-bold" style={{ color: banner.color }}>{banner.label}</p>
            <p className="text-sm text-gray-500">{banner.sub}</p>
          </div>
          {eta && liveStatus !== 'DELIVERED' && (
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold" style={{ color: banner.color }}>{eta}</p>
              <p className="text-xs text-gray-400">min away</p>
            </div>
          )}
        </div>
      </div>

      {order.deliveryPartner && GPS_ACTIVE_STATUSES.has(liveStatus) && (
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
            {order.deliveryPartner.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-sm">{order.deliveryPartner.name}</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {DEMO_MODE ? 'Simulated tracking' : 'Live tracking'}
            </p>
          </div>
          {order.deliveryPartner.phone && (
            <a href={`tel:${order.deliveryPartner.phone}`} className="ml-auto bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
              📞 Call
            </a>
          )}
        </div>
      )}

      <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between border-b">
          <span className="font-semibold text-sm">Live Location</span>
          {showGPS && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">● {DEMO_MODE ? 'Simulated' : 'LIVE'}</span>}
        </div>
        
        <div className="h-64 relative">
          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OSM" />
            {showGPS && <MapPanner position={riderPosition} />}
            {showGPS && <Marker position={riderPosition} icon={isPaused ? pausedIcon : makeRiderIcon(bearing)}>
              <Popup>{DEMO_MODE ? '🚴 Simulated Rider' : 'Your rider'}</Popup>
            </Marker>}
            {order.kitchen?.latitude && <Marker position={[order.kitchen.latitude, order.kitchen.longitude]} icon={restaurantIcon}>
              <Popup>Restaurant</Popup>
            </Marker>}
            {order.deliveryLatitude && <Marker position={[order.deliveryLatitude, order.deliveryLongitude]} icon={homeIcon}>
              <Popup>Your location</Popup>
            </Marker>}
            {route && <Polyline positions={route} color="#f97316" weight={4} opacity={0.85} />}
          </MapContainer>

          {!showGPS && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-[500]">
              <span className="text-4xl mb-2">🛵</span>
              <p className="text-sm text-gray-500">
                {liveStatus === 'DELIVERED' ? 'Order delivered!' : 'Waiting for rider...'}
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-2 flex gap-4 text-xs text-gray-500 border-t">
          {order.kitchen?.latitude && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Kitchen</span>}
          {order.deliveryLatitude && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> You</span>}
          {showGPS && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Rider</span>}
        </div>

        {nextStep && showGPS && liveStatus !== 'DELIVERED' && (
          <div className="px-4 py-3 flex items-center gap-3 border-t">
            <span className="text-2xl">{nextStep.maneuver?.type === 'turn' ? '↩️' : '⬆️'}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{nextStep.name || 'Continue straight'}</p>
              <p className="text-xs text-gray-500">{Math.round(nextStep.distance)}m</p>
            </div>
            {eta && <div className="text-right"><p className="text-xl font-bold text-orange-500">{eta}</p><p className="text-xs text-gray-400">min</p></div>}
          </div>
        )}
      </div>

      <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
        <p className="font-semibold text-sm mb-4">Order Progress</p>
        <div className="space-y-3">
          {ALL_STEPS.map((step, i) => {
            const done = i < currentStep;
            const current = i === currentStep;
            const pending = i > currentStep;
            return (
              <div key={step.key} className="flex items-center gap-3 relative">
                {i < ALL_STEPS.length - 1 && (
                  <div className="absolute left-4 top-8 w-0.5 h-full -z-10" style={{ background: done ? '#f97316' : '#e2e8f0' }} />
                )}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${done || current ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'} ${current ? 'scale-110 shadow-lg shadow-orange-200' : ''}`}>
                  {done ? '✓' : step.icon}
                </div>
                <div className={`flex-1 ${pending ? 'text-gray-300' : current ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                  {step.label}
                  {current && step.sub && <p className="text-xs text-gray-400 mt-0.5">{step.sub}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {order.items?.length > 0 && (
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
          <p className="font-semibold text-sm mb-3">Your Order</p>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-gray-600">{item.itemName || item.menuItem?.name}</span>
              <span className="text-gray-400">×{item.quantity}</span>
              <span className="font-semibold">₹{item.totalPrice || item.itemPrice * item.quantity}</span>
            </div>
          ))}
          
          <div className="border-t mt-3 pt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>₹{order.subtotal || order.totalAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery Fee</span>
              <span>₹{order.deliveryFee || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax (GST)</span>
              <span>₹{order.tax || 0}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t mt-2 pt-2">
              <span>Total</span>
              <span className="text-orange-500">₹{order.totalAmount}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t text-center">
            <p className="text-xs text-gray-400 mb-1">☕ Your food, delivered to your door 🏠</p>
            <p className="text-[10px] text-amber-600">© 2024 CloudBite. Made with ❤️ for Maharashtra's home kitchens.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateBearing(from, to) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(to[1] - from[1]);
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
