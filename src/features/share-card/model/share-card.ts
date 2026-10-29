import type { BucketItemInput } from '@/entities/bucket-item'
import { buildShareText, cardFileName } from '../lib/card-text'

// 공유 시트를 열면 null, 저장·복사로 넘어가면 화면에 보일 안내 문구
export async function shareCard(png: Blob, item: Pick<BucketItemInput, 'title' | 'targetPeriod'>): Promise<string | null> {
  const text = buildShareText(item)
  const name = cardFileName(item.title)
  const files = [new File([png], name, { type: 'image/png' })]

  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, text })
      return null
    } catch (error) {
      // 사용자가 시트를 닫은 것. 다른 실패는 아래 저장·복사로 넘어간다
      if (error instanceof DOMException && error.name === 'AbortError') return null
    }
  }

  const url = URL.createObjectURL(png)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  // 클릭 직후 해제하면 일부 브라우저에서 다운로드가 시작되기 전에 끊긴다
  setTimeout(() => URL.revokeObjectURL(url), 10_000)

  try {
    await navigator.clipboard.writeText(text)
    return '이미지를 저장하고 문구를 복사했어요'
  } catch {
    return '이미지를 저장했어요'
  }
}
