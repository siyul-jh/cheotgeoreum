import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { InstallGuide } from './install-guide'

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
