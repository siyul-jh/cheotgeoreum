import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { shareCard } from './share-card'

const item = { title: '오로라 보기', targetPeriod: '2027-03' }
const TEXT = '내 버킷리스트에 새 별이 떴어요 ✦ 오로라 보기 (2027년 3월)'
const png = new Blob(['png'], { type: 'image/png' })
const downloads: { download: string; href: string }[] = []

function stubNavigator(nav: { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> }) {
  const writeText = vi.fn(async (text: string) => void text)
  vi.stubGlobal('navigator', { ...nav, clipboard: { writeText } })
  return writeText
}

beforeEach(() => {
  downloads.length = 0
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ download: this.download, href: this.href })
  })
  // jsdom에는 object URL이 없다
  URL.createObjectURL = vi.fn(() => 'blob:card')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('파일 공유가 되면 공유 시트를 PNG와 문구로 연다', async () => {
  const share = vi.fn(async (data: ShareData) => void data)
  const writeText = stubNavigator({ canShare: () => true, share })
  expect(await shareCard(png, item)).toBeNull()
  const [data] = share.mock.calls[0]
  expect(data.text).toBe(TEXT)
  expect(data.files?.[0].name).toBe('첫걸음-오로라 보기.png')
  expect(data.files?.[0].type).toBe('image/png')
  expect(downloads).toHaveLength(0)
  expect(writeText).not.toHaveBeenCalled()
})

test('공유 시트를 닫으면(AbortError) 아무 문구도 없고 저장하지 않는다', async () => {
  stubNavigator({ canShare: () => true, share: () => Promise.reject(new DOMException('cancel', 'AbortError')) })
  expect(await shareCard(png, item)).toBeNull()
  expect(downloads).toHaveLength(0)
})

test('그 밖의 공유 실패는 저장·복사로 넘어간다', async () => {
  const writeText = stubNavigator({
    canShare: () => true,
    share: () => Promise.reject(new DOMException('blocked', 'NotAllowedError')),
  })
  expect(await shareCard(png, item)).toBe('이미지를 저장하고 문구를 복사했어요')
  expect(downloads).toHaveLength(1)
  expect(writeText).toHaveBeenCalledWith(TEXT)
})

test('Web Share가 없으면 PNG를 내려받고 문구를 복사한 뒤 object URL을 해제한다', async () => {
  vi.useFakeTimers()
  const writeText = stubNavigator({})
  expect(await shareCard(png, item)).toBe('이미지를 저장하고 문구를 복사했어요')
  expect(downloads).toEqual([{ download: '첫걸음-오로라 보기.png', href: 'blob:card' }])
  expect(writeText).toHaveBeenCalledWith(TEXT)
  vi.runAllTimers()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:card')
})

test('파일 공유를 못 하면(canShare false) 문구만 공유하지 않고 저장·복사한다', async () => {
  const share = vi.fn(async () => {})
  stubNavigator({ canShare: () => false, share })
  expect(await shareCard(png, item)).toBe('이미지를 저장하고 문구를 복사했어요')
  expect(share).not.toHaveBeenCalled()
  expect(downloads).toHaveLength(1)
})

test('클립보드에 못 쓰면 저장만 알린다', async () => {
  const writeText = stubNavigator({})
  writeText.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
  expect(await shareCard(png, item)).toBe('이미지를 저장했어요')
  expect(downloads).toHaveLength(1)
})
