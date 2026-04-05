import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const WS_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/ws`
  : 'http://localhost:8080/ws'

export const useWebSocket = (subscriptions = []) => {
  const clientRef = useRef(null)
  const subscriptionsRef = useRef(subscriptions)
  const shouldLogRef = useRef(false)

  useEffect(() => {
    subscriptionsRef.current = subscriptions
  }, [subscriptions])

  useEffect(() => {
    const token = localStorage.getItem('cloudbite_token')
    if (!token) return

    shouldLogRef.current = true
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        subscriptionsRef.current.forEach(({ topic, callback }) => {
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
        if (import.meta.env.DEV && shouldLogRef.current) {
          console.log('WS disconnected')
        }
      },
      onStompError: (frame) => {
        if (import.meta.env.DEV) {
          console.error('STOMP error', frame)
        }
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      shouldLogRef.current = false
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
