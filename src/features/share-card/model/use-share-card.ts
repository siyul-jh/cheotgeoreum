import { useEffect, useState } from 'react'
import type { BucketItemInput } from '@/entities/bucket-item'
import { buildCardModel } from '../lib/card-model'
import { createCardPng } from '../lib/draw-card'
import { shareCard } from './share-card'

export function useShareCard(item: BucketItemInput) {
  // 공유 시트는 클릭(사용자 활성화) 직후에 열어야 해서 화면이 뜰 때 미리 그린다. 미리보기도 같은 PNG를 쓴다
  const [card, setCard] = useState<{ png: Blob; url: string } | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let url: string | null = null
    let live = true
    createCardPng(buildCardModel(item))
      .then((png) => {
        if (!live) return
        url = URL.createObjectURL(png)
        setCard({ png, url })
      })
      .catch(() => {
        if (live) setNotice('이미지를 만들지 못했어요')
      })
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [item])

  const share = async () => {
    if (!card) return
    setPending(true)
    setNotice('')
    try {
      setNotice((await shareCard(card.png, item)) ?? '')
    } catch {
      setNotice('공유하지 못했어요')
    } finally {
      setPending(false)
    }
  }

  // 카드가 준비되기 전에는 공유할 수 없다(기다리는 사이 사용자 활성화가 끊긴다)
  return { share, pending: pending || card === null, notice, preview: card?.url ?? null }
}
