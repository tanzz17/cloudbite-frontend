import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function useOrderWebSocket(orderId, { onLocation, onStatus }) {
  const clientRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    const token = localStorage.getItem('cloudbite_token');
    const client = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/order/${orderId}/location`, (msg) => {
          const data = JSON.parse(msg.body);
          onLocation?.(data);
        });
        client.subscribe(`/topic/order/${orderId}/status`, (msg) => {
          const data = JSON.parse(msg.body);
          onStatus?.(data.status);
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [orderId]);

  return clientRef;
}
