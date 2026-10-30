import { useEffect, useMemo, useState } from 'react'
import type { ItemValues } from '@/entities/bucket-item'
import { buildCardModel } from '../lib/card-model'
import { createCardPng } from '../lib/draw-card'
import { encodeCard, shareUrl } from '../lib/share-link'
import { downloadPng, shareLink } from './share-card'

export function useStarCard(item: ItemValues) {
  const card = useMemo(() => buildCardModel(item), [item])
  // 공유 시트·다운로드는 클릭(사용자 활성화) 직후에 열어야 해서 화면이 뜰 때 링크와 PNG를 따로 미리 만든다
  const [url, setUrl] = useState<string | null>(null)
  const [png, setPng] = useState<Blob | null>(null)
  // 둘 다 실패해도 한쪽 문구가 지워지지 않게 따로 둔다
  const [shareNotice, setShareNotice] = useState('')
  const [saveNotice, setSaveNotice] = useState('')

  useEffect(() => {
    let live = true
    encodeCard(item)
      .then((payload) => {
        if (live) setUrl(shareUrl(payload))
      })
      .catch(() => {
        if (live) setShareNotice('공유 링크를 만들지 못했어요')
      })
    createCardPng(card)
      .then((blob) => {
        if (live) setPng(blob)
      })
      .catch(() => {
        if (live) setSaveNotice('이미지를 만들지 못했어요')
      })
    return () => {
      live = false
    }
  }, [item, card])

  const share = async () => {
    if (!url) return
    setShareNotice('')
    setShareNotice((await shareLink(url, item)) ?? '')
  }
  const save = () => {
    if (png) downloadPng(png, item.title)
  }

  return { card, url, png, share, save, notice: [shareNotice, saveNotice].filter(Boolean).join(' · ') }
}
