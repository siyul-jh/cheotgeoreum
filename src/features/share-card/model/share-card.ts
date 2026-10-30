import type { ItemValues } from '@/entities/bucket-item'
import { buildShareText, cardFileName } from '../lib/card-text'

// 기기 공유 창을 열었으면(닫은 것도 포함) true. 공유 창이 없거나(https가 아닌 주소·일부 브라우저) 막히면 false → 앱 공유 시트를 연다
export async function openNativeShare(url: string, item: Pick<ItemValues, 'title' | 'targetPeriod'>): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false
  try {
    // 사용자 활성화가 끊기지 않게 await 전에 부른다
    await navigator.share({ title: '첫걸음', text: buildShareText(item), url })
    return true
  } catch (error) {
    // AbortError: 사용자가 공유 창을 닫은 것
    return error instanceof DOMException && error.name === 'AbortError'
  }
}

// 기기 공유 창이 없을 때 앱 공유 시트의 보낼 곳. 모두 보안 컨텍스트 없이 열리는 주소다
export function shareTargets(url: string, text: string): { label: string; href: string }[] {
  const body = encodeURIComponent(`${text}\n${url}`)
  return [
    // iOS는 sms:&body=, Android는 sms:?body=를 읽는다. ?&body=는 둘 다 읽는다
    { label: '메시지', href: `sms:?&body=${body}` },
    { label: '이메일', href: `mailto:?subject=${encodeURIComponent('첫걸음')}&body=${body}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
  ]
}

// clipboard API는 보안 컨텍스트(https·localhost)에만 있다. 없거나 거부되면 선택+execCommand로 복사한다
// (같은 Wi-Fi의 http 주소, 일부 인앱 브라우저). execCommand는 폐기 예정이지만 아직 모든 모바일 브라우저가 지원한다
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const field = document.createElement('textarea')
    field.value = text
    field.readOnly = true // iOS에서 키보드가 뜨지 않게
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.append(field)
    field.select()
    field.setSelectionRange(0, text.length) // iOS는 select()만으로 선택되지 않는다
    const ok = document.execCommand('copy')
    field.remove()
    return ok
  }
}

export function downloadPng(png: Blob, title: string) {
  const url = URL.createObjectURL(png)
  const link = document.createElement('a')
  link.href = url
  link.download = cardFileName(title)
  link.click()
  // 클릭 직후 해제하면 일부 브라우저에서 다운로드가 시작되기 전에 끊긴다
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
