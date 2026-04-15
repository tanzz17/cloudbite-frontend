import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function useGPSSender(orderId, riderId, isActive) {
  const intervalRef = useRef(null);
  const prevCoords = useRef(null);

  const startSending = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    console.log('🛰️ GPS tracking STARTED for order:', orderId, 'rider:', riderId);

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, heading, speed } = pos.coords;

          let bearing = heading ?? 0;
          if (prevCoords.current && !heading) {
            bearing = calculateBearing(prevCoords.current, { latitude, longitude });
          }
          prevCoords.current = { latitude, longitude };

          console.log('📍 Sending GPS:', { orderId, riderId, latitude, longitude });
          
          axios.post(`${BASE_URL}/api/tracking/location`, {
            orderId,
            riderId,
            latitude,
            longitude,
            bearing,
            speed: speed ? speed * 3.6 : 0,
          }).then(() => {
            console.log('✅ GPS sent successfully');
          }).catch((err) => {
            console.error('❌ GPS send failed:', err);
          });
        },
        (err) => {
          console.error('❌ Geolocation error:', err);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }, 3000);
  }, [orderId, riderId]);

  const stopSending = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      console.log('🛑 GPS tracking STOPPED')
    }
  }, []);

  useEffect(() => {
    if (isActive) startSending();
    else stopSending();
    return () => stopSending();
  }, [isActive]);

  return { startSending, stopSending };
}

function calculateBearing(from, to) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
