import { afterEach, expect, test, vi } from 'vitest'
import { downloadPng, shareLink } from './share-card'

const item = { title: '오로라 보기', targetPeriod: { kind: 'start', at: '2027-03' } as const }
const TEXT = '내 버킷리스트에 새 별이 떴어요 ✦ 오로라 보기 (2027년 3월쯤)'
const LINK = 'http://localhost:3000/s#1.abc'

function stubNavigator(nav: { share?: (d: ShareData) => Promise<void> }) {
  const writeText = vi.fn(async (text: string) => void text)
  vi.stubGlobal('navigator', { ...nav, clipboard: { writeText } })
  return writeText
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('공유 시트를 링크·문구로 열고, 성공하면 문구가 없다', async () => {
  const share = vi.fn(async (data: ShareData) => void data)
  const writeText = stubNavigator({ share })
  expect(await shareLink(LINK, item)).toBeNull()
  expect(share).toHaveBeenCalledWith({ title: '첫걸음', text: TEXT, url: LINK })
  expect(writeText).not.toHaveBeenCalled()
})

test('공유 시트는 첫 동기 구간에서 열린다(사용자 활성화 유지)', () => {
  const share = vi.fn(async () => {})
  stubNavigator({ share })
  void shareLink(LINK, item)
  expect(share).toHaveBeenCalledTimes(1)
})

test('공유 시트를 닫으면(AbortError) 조용하고 복사하지 않는다', async () => {
  const writeText = stubNavigator({ share: () => Promise.reject(new DOMException('cancel', 'AbortError')) })
  expect(await shareLink(LINK, item)).toBeNull()
  expect(writeText).not.toHaveBeenCalled()
})

test('Web Share가 없으면 링크를 복사한다', async () => {
  const writeText = stubNavigator({})
  expect(await shareLink(LINK, item)).toBe('링크를 복사했어요')
  expect(writeText).toHaveBeenCalledWith(LINK)
})

test('그 밖의 공유 실패도 링크를 복사한다', async () => {
  const writeText = stubNavigator({ share: () => Promise.reject(new DOMException('blocked', 'NotAllowedError')) })
  expect(await shareLink(LINK, item)).toBe('링크를 복사했어요')
  expect(writeText).toHaveBeenCalledWith(LINK)
})

// 같은 Wi-Fi의 http 주소처럼 보안 컨텍스트가 아니면 share·clipboard가 아예 없다
test('share·clipboard가 없으면 입력칸을 선택해 execCommand로 복사하고 입력칸은 지운다', async () => {
  vi.stubGlobal('navigator', {})
  const exec = vi.fn((command: string) => command === 'copy' && document.querySelector('textarea')?.value === LINK)
  document.execCommand = exec
  expect(await shareLink(LINK, item)).toBe('링크를 복사했어요')
  expect(exec).toHaveBeenCalledWith('copy')
  expect(document.querySelector('textarea')).toBeNull()
})

test('복사까지 막히면 링크가 담긴 입력창을 띄워 직접 복사하게 한다', async () => {
  vi.stubGlobal('navigator', {})
  document.execCommand = vi.fn(() => false)
  const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null)
  expect(await shareLink(LINK, item)).toBeNull()
  expect(prompt).toHaveBeenCalledWith('이 링크를 길게 눌러 복사해 주세요', LINK)
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
