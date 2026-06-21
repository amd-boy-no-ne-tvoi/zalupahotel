import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'

export function usePushSubscription() {
  const [state, setState] = useState<PushState>('loading')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    // Check current subscription on server
    api.get('/push/status')
      .then(({ data }) => setState(data.subscribed ? 'subscribed' : 'unsubscribed'))
      .catch(() => setState('unsubscribed'))
  }, [])

  const subscribe = useCallback(async () => {
    setState('loading')
    try {
      const { data: { key } } = await api.get('/push/vapid-public-key')
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })
      const json = sub.toJSON()
      await api.post('/push/subscribe', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      })
      setState('subscribed')
    } catch {
      if (Notification.permission === 'denied') setState('denied')
      else setState('unsubscribed')
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setState('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.delete('/push/subscribe', { data: { endpoint: sub.endpoint } })
        await sub.unsubscribe()
      }
      setState('unsubscribed')
    } catch {
      setState('subscribed')
    }
  }, [])

  return { state, subscribe, unsubscribe }
}
