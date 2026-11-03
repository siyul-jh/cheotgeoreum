import { useEffect, useState } from 'react'
import { deletePushSubscription, savePushSubscription, sendTestPush, type PushSubscriptionInput } from '../api/push-subscription'

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

// 앱을 열 때 이 기기의 구독을 다시 저장한다. 브라우저가 구독을 바꾸면(iOS는 pushsubscriptionchange를 믿기 어렵다) 서버 주소가 옛것으로 남아 알림이 끊기기 때문
// 같은 주소면 서버가 그대로 덮어쓴다. 로그인 안 했거나 실패해도 조용히 넘긴다
export async function resaveReminder() {
  if (!supported() || !VAPID_KEY) return
  const sub = await currentSubscription().catch(() => null)
  if (sub) await savePushSubscription({ data: sub.toJSON() as PushSubscriptionInput }).catch(() => {})
}

type State = 'loading' | 'unsupported' | 'denied' | 'off' | 'on'
const NOTICE: Partial<Record<State, string>> = {
  unsupported: '이 기기에서는 알림을 받을 수 없어요. 홈 화면에 설치한 앱에서 켜 주세요(아이폰은 iOS 16.4 이상).',
  denied: '알림이 차단돼 있어요. 기기 설정에서 첫걸음 알림을 허용해 주세요.',
}

export function ReminderToggle() {
  const [state, setState] = useState<State>(() =>
    !supported() || !VAPID_KEY ? 'unsupported' : Notification.permission === 'denied' ? 'denied' : 'loading',
  )
  const [error, setError] = useState(false)
  const [test, setTest] = useState<'idle' | 'sending' | 'arrived' | 'lost' | 'failed' | 'stale'>('idle')

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

  const sendTest = async () => {
    setTest('sending')
    // 새 서비스 워커가 기다리는 중이면 옛 워커(알림 처리 없음)가 받아 화면에 안 뜬다. 앱을 완전히 닫아야 바뀐다
    const reg = await navigator.serviceWorker.ready
    await reg.update().catch(() => {})
    if (reg.waiting || reg.installing) return setTest('stale')
    const sub = await currentSubscription().catch(() => null)
    // 서비스 워커가 알림을 띄우고 보내는 도착 신호를 15초 기다린다
    const arrived = new Promise<boolean>((resolve) => {
      const onMessage = (e: MessageEvent) => {
        if (e.data?.type !== 'push-received') return
        navigator.serviceWorker.removeEventListener('message', onMessage)
        resolve(true)
      }
      navigator.serviceWorker.addEventListener('message', onMessage)
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', onMessage)
        resolve(false)
      }, 15_000)
    })
    const result = sub ? await sendTestPush({ data: { endpoint: sub.endpoint } }).catch(() => ({ ok: false })) : { ok: false }
    if (!result.ok) return setTest('failed')
    setTest((await arrived) ? 'arrived' : 'lost')
  }

  if (state === 'loading') return null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">목표 시기 알림</span>
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
      {state === 'on' && (
        <button
          type="button"
          className="press min-h-11 self-start text-sm text-mute underline underline-offset-4 disabled:opacity-50"
          disabled={test === 'sending'}
          onClick={() => void sendTest()}
        >
          시험 알림 보내기
        </button>
      )}
      {test === 'sending' && (
        <p role="status" className="text-[13px] text-mute">
          보내는 중이에요. 도착을 확인하고 있어요(최대 15초).
        </p>
      )}
      {test === 'arrived' && (
        <p role="status" className="text-[13px] text-mute">
          이 기기에 도착해 알림을 띄웠어요. 배너가 안 보였다면 알림 센터와 기기 설정의 첫걸음 알림·집중 모드를 확인해 주세요.
        </p>
      )}
      {test === 'lost' && (
        <p role="alert" className="text-[13px] text-danger">
          보냈지만 15초 안에 이 기기에 도착하지 않았어요. 알림을 껐다가 다시 켠 뒤 시험해 주세요.
        </p>
      )}
      {test === 'stale' && (
        <p role="alert" className="text-[13px] text-danger">
          앱이 새 버전으로 바뀌는 중이에요. 앱을 완전히 닫았다가(위로 쓸어 올려 종료) 다시 열고 눌러 주세요.
        </p>
      )}
      {test === 'failed' && (
        <p role="alert" className="text-[13px] text-danger">
          시험 알림을 보내지 못했어요. 알림을 껐다가 다시 켜 보세요.
        </p>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          알림을 켜지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
    </div>
  )
}
