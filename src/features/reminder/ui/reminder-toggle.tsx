import { useEffect, useState } from 'react'
import { deletePushSubscription, savePushSubscription, type PushSubscriptionInput } from '../api/push-subscription'

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// VAPID 공개키(base64url)를 subscribe가 받는 바이트로
export function urlBase64ToUint8Array(key: string): Uint8Array<ArrayBuffer> {
  const raw = atob((key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const currentSubscription = async () => (await navigator.serviceWorker.ready).pushManager.getSubscription()

// 이 기기의 알림을 끈다(로그아웃 전에도 부른다). 실패해도 막지 않는다
export async function turnOffReminder() {
  if (!supported()) return
  const sub = await currentSubscription().catch(() => null)
  if (!sub) return
  await deletePushSubscription({ data: { endpoint: sub.endpoint } }).catch(() => {})
  await sub.unsubscribe().catch(() => {})
}

type State = 'loading' | 'unsupported' | 'denied' | 'off' | 'on'
const NOTICE: Partial<Record<State, string>> = {
  unsupported: '이 기기에서는 알림을 받을 수 없어요. 홈 화면에 설치한 앱에서 켜 주세요(아이폰은 iOS 16.4 이상).',
  denied: '알림이 차단돼 있어요. 기기 설정에서 첫걸음 알림을 허용해 주세요.',
}

// ponytail: 구독이 바뀌는 경우(pushsubscriptionchange)는 다시 저장하지 않는다. 알림이 끊긴다는 말이 나오면 시작할 때 다시 저장
export function ReminderToggle() {
  const [state, setState] = useState<State>(() =>
    !supported() || !VAPID_KEY ? 'unsupported' : Notification.permission === 'denied' ? 'denied' : 'loading',
  )
  const [error, setError] = useState(false)

  // 켜져 있는지는 이 기기의 구독이 있는지로 안다
  useEffect(() => {
    if (state === 'loading') void currentSubscription().then((sub) => setState(sub ? 'on' : 'off'), () => setState('off'))
  }, [state])

  const turnOn = async () => {
    setError(false)
    // 권한 요청은 누른 직후에 해야 한다(iOS)
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return setState(permission === 'denied' ? 'denied' : 'off')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_KEY!) })
      const result = await savePushSubscription({ data: sub.toJSON() as PushSubscriptionInput })
      if (!result.ok) {
        await sub.unsubscribe()
        throw new Error(result.code)
      }
      setState('on')
    } catch {
      setError(true)
    }
  }

  const turnOff = async () => {
    await turnOffReminder()
    setState('off')
  }

  if (state === 'loading') return null
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">목표 시기 알림</span>
        {(state === 'on' || state === 'off') && (
          <button
            type="button"
            role="switch"
            aria-checked={state === 'on'}
            aria-label="목표 시기 알림"
            className={`press min-h-11 rounded-full border px-4 text-sm ${state === 'on' ? 'border-gold text-gold' : 'border-edge text-mute'}`}
            onClick={() => void (state === 'on' ? turnOff() : turnOn())}
          >
            {state === 'on' ? '켜짐' : '꺼짐'}
          </button>
        )}
      </div>
      <p className="text-[13px] text-mute">
        {NOTICE[state] ?? '매일 보내지 않아요. 꿈의 목표 시기에 맞춰 7·3·1일 전과 당일 등에만 알려 드려요. 목표 시기가 언젠가인 꿈은 알리지 않아요.'}
      </p>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          알림을 켜지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
    </div>
  )
}
