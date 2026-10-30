import { afterEach, expect, test, vi } from 'vitest'
import { copyText, downloadPng, openNativeShare, shareTargets } from './share-card'

const item = { title: '오로라 보기', targetPeriod: { kind: 'start', at: '2027-03' } as const }
const TEXT = '내 버킷리스트에 새 별이 떴어요 ✦ 오로라 보기 (2027년 3월쯤)'
const LINK = 'http://localhost:3000/s#1.abc'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('기기 공유 창을 링크·문구로 열고 true', async () => {
  const share = vi.fn(async (data: ShareData) => void data)
  vi.stubGlobal('navigator', { share })
  expect(await openNativeShare(LINK, item)).toBe(true)
  expect(share).toHaveBeenCalledWith({ title: '첫걸음', text: TEXT, url: LINK })
})

test('공유 창은 첫 동기 구간에서 열린다(사용자 활성화 유지)', () => {
  const share = vi.fn(async () => {})
  vi.stubGlobal('navigator', { share })
  void openNativeShare(LINK, item)
  expect(share).toHaveBeenCalledTimes(1)
})

test('사용자가 공유 창을 닫으면(AbortError) true: 앱 시트를 또 열지 않는다', async () => {
  vi.stubGlobal('navigator', { share: () => Promise.reject(new DOMException('cancel', 'AbortError')) })
  expect(await openNativeShare(LINK, item)).toBe(true)
})

test('공유 창이 없거나(https 아님) 막히면 false: 앱 공유 시트로 간다', async () => {
  vi.stubGlobal('navigator', {})
  expect(await openNativeShare(LINK, item)).toBe(false)
  vi.stubGlobal('navigator', { share: () => Promise.reject(new DOMException('blocked', 'NotAllowedError')) })
  expect(await openNativeShare(LINK, item)).toBe(false)
})

test('앱 공유 시트의 보낼 곳: 메시지·이메일은 문구+링크, X는 문구와 링크를 따로', () => {
  const [sms, mail, x] = shareTargets(LINK, TEXT)
  expect(decodeURIComponent(sms.href)).toBe(`sms:?&body=${TEXT}\n${LINK}`)
  expect(decodeURIComponent(mail.href)).toBe(`mailto:?subject=첫걸음&body=${TEXT}\n${LINK}`)
  const tweet = new URL(x.href)
  expect(tweet.searchParams.get('text')).toBe(TEXT)
  expect(tweet.searchParams.get('url')).toBe(LINK) // 해시(#1.abc)가 잘리지 않는다
})

test('clipboard가 있으면 그것으로 복사한다', async () => {
  const writeText = vi.fn(async (text: string) => void text)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  expect(await copyText(LINK)).toBe(true)
  expect(writeText).toHaveBeenCalledWith(LINK)
})

// 같은 Wi-Fi의 http 주소처럼 보안 컨텍스트가 아니면 clipboard가 아예 없다
test('clipboard가 없으면 입력칸을 선택해 execCommand로 복사하고 입력칸은 지운다', async () => {
  vi.stubGlobal('navigator', {})
  const exec = vi.fn((command: string) => command === 'copy' && document.querySelector('textarea')?.value === LINK)
  document.execCommand = exec
  expect(await copyText(LINK)).toBe(true)
  expect(document.querySelector('textarea')).toBeNull()
  document.execCommand = vi.fn(() => false)
  expect(await copyText(LINK)).toBe(false)
})

test('PNG를 제목 파일명으로 내려받고 10초 뒤 object URL을 해제한다', () => {
  vi.useFakeTimers()
  const downloads: { download: string; href: string }[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ download: this.download, href: this.href })
  })
  // jsdom에는 object URL이 없다
  URL.createObjectURL = vi.fn(() => 'blob:card')
  URL.revokeObjectURL = vi.fn()
  downloadPng(new Blob(['png'], { type: 'image/png' }), '오로라 보기')
  expect(downloads).toEqual([{ download: '첫걸음-오로라 보기.png', href: 'blob:card' }])
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  vi.advanceTimersByTime(10_000)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:card')
})
