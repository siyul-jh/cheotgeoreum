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
  try {
    await navigator.clipboard.writeText(url)
    return '링크를 복사했어요'
  } catch {
    return '링크를 복사하지 못했어요'
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
