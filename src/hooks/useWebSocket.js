import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const WS_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/ws`
  : 'http://localhost:8080/ws'

export const useWebSocket = (subscriptions = []) => {
  const clientRef = useRef(null)
  const subscriptionsRef = useRef(subscriptions)

  useEffect(() => {
    subscriptionsRef.current = subscriptions
  }, [subscriptions])

  useEffect(() => {
    const token = localStorage.getItem('cloudbite_token')
    if (!token) {
      console.log('🔌 No token - WebSocket not connecting')
      return
    }

    console.log('🔌 Connecting WebSocket...')
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('✅ WebSocket Connected! Subscribing to:', subscriptionsRef.current.map(s => s.topic))
        subscriptionsRef.current.forEach(({ topic, callback }) => {
          console.log('📡 Subscribed to:', topic)
          client.subscribe(topic, (message) => {
            try {
              callback(JSON.parse(message.body))
            } catch {
              callback(message.body)
            }
          })
        })
      },
      onDisconnect: () => {
        console.log('🔌 WebSocket disconnected')
      },
      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame)
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
    }
  }, [])

  const publish = useCallback((destination, body) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({ destination, body: JSON.stringify(body) })
    }
  }, [])

  return { publish }
}
