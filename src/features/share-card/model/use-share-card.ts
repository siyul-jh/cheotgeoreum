import { useEffect, useState } from 'react'
import type { BucketItemInput } from '@/entities/bucket-item'
import { createCardPng } from '../lib/draw-card'
import { shareCard } from './share-card'

export function useShareCard(item: BucketItemInput) {
  // 공유 시트는 클릭(사용자 활성화) 직후에 열어야 한다. 클릭 뒤 서체 로드·그리기를 기다리면 활성화가 끊길 수 있어 화면이 뜰 때 미리 그린다
  const [card] = useState(() => {
    const png = createCardPng(item)
    png.catch(() => null) // 실패는 [공유하기]를 누를 때 알린다
    return png
  })
  // 축하 화면 미리보기: 같은 PNG를 object URL로 보인다. 화면을 떠나면 해제
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    let url: string | null = null
    let live = true
    card
      .then((png) => {
        if (!live) return
        url = URL.createObjectURL(png)
        setPreview(url)
      })
      .catch(() => null) // 실패면 미리보기 없이 둔다
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [card])
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')

  const share = async () => {
    setPending(true)
    setNotice('')
    try {
      setNotice((await shareCard(await card, item)) ?? '')
    } catch {
      setNotice('이미지를 만들지 못했어요')
    } finally {
      setPending(false)
    }
  }

  return { share, pending, notice, preview }
}
