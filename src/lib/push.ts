import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export const pushSupportato =
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

export const pushConfigurato = Boolean(VAPID_PUBLIC_KEY)

function base64UrlAUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function statoIscrizione(): Promise<boolean> {
  if (!pushSupportato) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription !== null
}

export async function attivaNotifiche(userId: string): Promise<{ error: string | null }> {
  if (!pushSupportato) return { error: 'Il browser non supporta le notifiche push.' }
  if (!VAPID_PUBLIC_KEY) return { error: 'Notifiche non configurate su questa installazione.' }

  const permesso = await Notification.requestPermission()
  if (permesso !== 'granted') {
    return { error: 'Permesso per le notifiche negato.' }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlAUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  })

  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
    { onConflict: 'endpoint' },
  )

  if (error) return { error: error.message }
  return { error: null }
}

export async function disattivaNotifiche(): Promise<{ error: string | null }> {
  if (!pushSupportato) return { error: null }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return { error: null }

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()

  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) return { error: error.message }
  return { error: null }
}
