import { expect, test, vi } from 'vitest'
import { authClient } from './auth-client'

test('창 포커스를 받으면 세션 신호를 울리되 5초 안에 다시 오면 한 번만', () => {
  vi.useFakeTimers()
  // $store는 Proxy라 spy 대신 세션 신호 atom이 바뀐 횟수를 센다
  const signal = authClient.$store.atoms.$sessionSignal
  let changes = 0
  const unlisten = signal.listen(() => changes++)
  dispatchEvent(new Event('focus'))
  dispatchEvent(new Event('focus'))
  expect(changes).toBe(1)
  vi.advanceTimersByTime(5_001)
  dispatchEvent(new Event('focus'))
  expect(changes).toBe(2)
  unlisten()
  vi.useRealTimers()
})
