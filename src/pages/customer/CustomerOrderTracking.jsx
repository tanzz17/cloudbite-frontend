import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useOrderWebSocket } from '../../hooks/useOrderWebSocket';
import { fetchRoute } from '../../utils/fetchRoute';

const riderIcon = (bearing = 0) => L.divIcon({
  className: '',
  html: `<div style="width:44px;height:44px;background:#FF6B35;border-radius:50% 50% 50% 0;border:3px solid white;transform:rotate(${bearing - 45}deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(${45 - bearing}deg);font-size:20px;">🛵</span></div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const restaurantIcon = L.divIcon({
  className: '',
  html: `<div style="background:#fff;border-radius:50%;padding:5px;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:24px;">🍽️</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const homeIcon = L.divIcon({
  className: '',
  html: `<div style="background:#fff;border-radius:50%;padding:5px;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:24px;">🏠</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function MapFollower({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true, duration: 0.8 });
  }, [position]);
  return null;
}

const STATUS_STEPS = {
  PENDING: { step: 0, label: 'Order Placed', icon: '🛒', color: '#EF4444' },
  CONFIRMED: { step: 1, label: 'Kitchen Confirmed', icon: '✅', color: '#F59E0B' },
  PREPARING: { step: 2, label: 'Preparing', icon: '👨‍🍳', color: '#F59E0B' },
  READY_FOR_PICKUP: { step: 3, label: 'Finding Rider', icon: '🔍', color: '#8B5CF6' },
  ACCEPTED: { step: 4, label: 'Rider Accepted!', icon: '🛵', color: '#3B82F6' },
  HEADING_TO_RESTAURANT: { step: 5, label: 'Rider heading to restaurant', icon: '🛵', color: '#3B82F6' },
  ARRIVED_AT_RESTAURANT: { step: 6, label: 'Rider arrived!', icon: '📍', color: '#8B5CF6' },
  PICKED_UP: { step: 7, label: 'Order picked up!', icon: '🍱', color: '#3B82F6' },
  HEADING_TO_CUSTOMER: { step: 8, label: 'On the way to you!', icon: '🚀', color: '#10B981' },
  DELIVERED: { step: 9, label: 'Delivered!', icon: '🎉', color: '#10B981' },
};

export default function CustomerOrderTracking({ order }) {
  const [riderPos, setRiderPos] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [status, setStatus] = useState(order?.status || 'PENDING');
  const [route, setRoute] = useState(null);
  const [eta, setEta] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);

  const restaurant = order?.kitchen?.latitude && order?.kitchen?.longitude
    ? { lat: order.kitchen.latitude, lng: order.kitchen.longitude }
    : null;
  const customer = order?.deliveryLatitude && order?.deliveryLongitude
    ? { lat: order.deliveryLatitude, lng: order.deliveryLongitude }
    : null;

  useOrderWebSocket(order?.id, {
    onLocation: (data) => {
      setRiderPos([data.latitude, data.longitude]);
      setBearing(data.bearing ?? 0);
      if (data.orderStatus) setStatus(data.orderStatus);
    },
    onStatus: (newStatus) => {
      setStatus(newStatus);
    },
  });

  useEffect(() => {
    if (!riderPos || !restaurant) return;
    const rider = { lat: riderPos[0], lng: riderPos[1] };
    const destination = ['HEADING_TO_CUSTOMER', 'PICKED_UP'].includes(status) ? customer : restaurant;
    if (!destination) return;

    fetchRoute(rider, destination).then((r) => {
      if (r) {
        setRoute(r.coordinates);
        setEta(r.eta);
        setCurrentStep(r.steps[0]);
      }
    });
  }, [riderPos, status]);

  const statusInfo = STATUS_STEPS[status] || STATUS_STEPS['PENDING'];
  const mapCenter = riderPos || (restaurant ? [restaurant.lat, restaurant.lng] : [18.5204, 73.8567]);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{statusInfo.icon}</span>
          <div>
            <p className="font-bold">{statusInfo.label}</p>
            {eta && status !== 'DELIVERED' && (
              <p className="text-sm text-white/70">ETA: ~{eta} min</p>
            )}
          </div>
          <div className="ml-auto flex gap-1.5">
            {[0,1,2,3,4,5,6,7,8,9].map(n => (
              <div key={n} style={{
                width: n <= statusInfo.step ? 10 : 6,
                height: n <= statusInfo.step ? 10 : 6,
                borderRadius: '50%',
                background: n <= statusInfo.step ? 'white' : 'rgba(255,255,255,0.3)',
              }} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden h-72 relative">
        <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {riderPos && <MapFollower position={riderPos} />}
          {riderPos && <Marker position={riderPos} icon={riderIcon(bearing)} />}
          {restaurant && <Marker position={[restaurant.lat, restaurant.lng]} icon={restaurantIcon} />}
          {customer && <Marker position={[customer.lat, customer.lng]} icon={homeIcon} />}
          {route && <Polyline positions={route} color="#3B82F6" weight={5} opacity={0.8} />}
        </MapContainer>

        {currentStep && status !== 'DELIVERED' && (
          <div className="absolute bottom-3 left-3 right-3 bg-white rounded-xl p-3 flex items-center gap-3 shadow-lg z-[999]">
            <span className="text-2xl">{currentStep.instruction === 'turn' ? '↩️' : '⬆️'}</span>
            <div>
              <p className="font-semibold text-sm">{currentStep.name || 'Continue'}</p>
              <p className="text-xs text-gray-500">{Math.round(currentStep.distance)}m</p>
            </div>
            {eta && (
              <div className="ml-auto text-right">
                <p className="text-xl font-bold text-blue-600">{eta}</p>
                <p className="text-[10px] text-gray-400">min</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
