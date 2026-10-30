import type { ItemValues } from '@/entities/bucket-item'
import { buildShareText, cardFileName } from '../lib/card-text'

// 공유 시트를 열면(또는 닫으면) null, 복사로 넘어가면 화면에 보일 안내 문구
export async function shareLink(url: string, item: Pick<ItemValues, 'title' | 'targetPeriod'>): Promise<string | null> {
  try {
    // 사용자 활성화가 끊기지 않게 await 전에 부른다. share가 없으면 TypeError로 아래 복사로 간다
    await navigator.share({ title: '첫걸음', text: buildShareText(item), url })
    return null
  } catch (error) {
    // 사용자가 시트를 닫은 것. 다른 실패는 복사로 넘어간다
    if (error instanceof DOMException && error.name === 'AbortError') return null
  }
  if (await copyText(url)) return '링크를 복사했어요'
  // ponytail: 복사까지 막힌 브라우저는 링크가 담긴 기본 입력창을 띄워 직접 복사하게 한다
  window.prompt('이 링크를 길게 눌러 복사해 주세요', url)
  return null
}

// clipboard API는 보안 컨텍스트(https·localhost)에만 있다. 없거나 거부되면 선택+execCommand로 복사한다
// (같은 Wi-Fi의 http 주소, 일부 인앱 브라우저). execCommand는 폐기 예정이지만 아직 모든 모바일 브라우저가 지원한다
async function copyText(text: string): Promise<boolean> {
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
