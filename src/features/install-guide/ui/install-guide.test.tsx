import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { InstallGuide, installSteps, isStandalone } from './install-guide'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('아이폰 Safari는 홈 화면에 추가 안내', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE)
  render(<InstallGuide />)
  expect(screen.getByText(/홈 화면에 추가/)).toBeTruthy()
})

test('카카오톡 안 브라우저는 기본 브라우저로 열기', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(`${IPHONE} KAKAOTALK 10.0.0`)
  render(<InstallGuide />)
  expect(screen.getByRole('link', { name: '기본 브라우저로 열기' }).getAttribute('href')).toMatch(/^kakaotalk:\/\/web\/openExternal\?url=/)
})

test('설치 가능 이벤트가 오면 [앱 설치]가 설치 창을 연다', () => {
  render(<InstallGuide />)
  const prompt = vi.fn(async () => {})
  act(() => {
    dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt }))
  })
  act(() => screen.getByRole('button', { name: '앱 설치' }).click())
  expect(prompt).toHaveBeenCalled()
})

test('브라우저 탭만 설치 안 한 것으로 보고, 다른 앱 창 방식(minimal-ui 등)은 설치한 앱으로 본다', () => {
  const mode = (current: string) =>
    vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({ matches: q === `(display-mode: ${current})` }) as MediaQueryList)
  mode('browser')
  expect(isStandalone()).toBe(false)
  mode('minimal-ui')
  expect(isStandalone()).toBe(true)
  mode('standalone')
  expect(isStandalone()).toBe(true)
})

test('브라우저마다 실제 메뉴 이름으로 안내한다', () => {
  const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)'
  expect(installSteps(`${MAC} Version/26.0 Safari/605.1.15`, true)[1]).toContain('홈 화면에 추가') // 아이패드
  expect(installSteps(`${MAC} Version/26.0 Safari/605.1.15`, false)[1]).toContain('Dock에 추가') // Mac Safari
  expect(installSteps(`${IPHONE.replace('Version/26.0', 'CriOS/156.0')}`, true)[0]).toContain('주소창 오른쪽')
  expect(installSteps('Mozilla/5.0 (Linux; Android 16) SamsungBrowser/29.0 Chrome/140 Mobile Safari/537.36', true)[1]).toContain('현재 페이지 추가')
  expect(installSteps('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:150.0) Gecko/20100101 Firefox/150.0', false)[0]).toContain('지원하지 않아요')
  expect(installSteps(`${MAC} Chrome/156.0 Safari/537.36 Whale/5.39`, false)[0]).toContain('이미 설치했다면')
})
