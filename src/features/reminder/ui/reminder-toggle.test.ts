import { expect, test } from 'vitest'
import { urlBase64ToUint8Array } from './reminder-toggle'

test('VAPID 공개키(base64url 87자)를 65바이트로 바꾼다', () => {
  const key = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
  const bytes = urlBase64ToUint8Array(key)
  expect(bytes).toHaveLength(65)
  expect(bytes[0]).toBe(4)
})
