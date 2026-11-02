import { useEffect, useMemo, useRef, useState } from 'react'
import type { BucketItem } from '@/entities/bucket-item'
import { XIcon } from '@/shared/ui/x-icon'
import { saveShortLink } from '../api/short-link'
import { buildListShareText } from '../lib/card-text'
import { encodeList, MAX_LIST_ITEMS, shareUrl } from '../lib/share-link'
import { shareLink } from '../model/share-card'

type Props = {
  items: BucketItem[]
  // 처음 체크해 둘 꿈(지금 목록에 보이는 꿈)
  initialIds: string[]
  onClose: () => void
}

// 고른 꿈들을 짧은 링크 하나로 나눈다. 열 때 마운트하고 닫으면 뺀다(다시 열면 체크가 처음으로)
export function ListShareSheet({ items, initialIds, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState(() => new Set(initialIds))
  // 만든 링크와 그때 고른 꿈. 고른 꿈이 바뀌면 새 링크가 나올 때까지 공유를 막는다
  const [link, setLink] = useState<{ for: BucketItem[]; url: string } | null>(null)
  const [notice, setNotice] = useState('')
  const picked = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected])
  const tooMany = picked.length > MAX_LIST_ITEMS
  const url = link?.for === picked ? link.url : null

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  // 공유 시트는 클릭 직후에 열어야 해서 링크를 미리 만든다. 체크를 연달아 바꾸는 동안은 기다렸다 한 번만 저장한다
  useEffect(() => {
    if (picked.length === 0 || tooMany) return
    let live = true
    const timer = setTimeout(() => {
      encodeList(picked)
        // 짧은 링크를 못 만들면 내용을 다 담은 긴 링크로 공유한다
        .then(async (payload) => shareUrl(await saveShortLink({ data: { payload } }).catch(() => payload)))
        .then((url) => live && setLink({ for: picked, url }))
        .catch(() => live && setNotice('공유 링크를 만들지 못했어요'))
    }, 400)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [picked, tooMany])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const allOn = picked.length === items.length

  return (
    <dialog
      ref={ref}
      aria-label="목록 공유"
      onClose={onClose}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-[20px] border-t border-line bg-card p-4 text-ink backdrop:bg-black/60 md:mx-auto md:max-w-md"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="flex-1 font-title text-xl font-bold">목록 공유</h2>
          <button
            type="button"
            className="press flex size-11 items-center justify-center rounded-full bg-night"
            aria-label="닫기"
            onClick={() => ref.current?.close()}
          >
            <XIcon className="size-[18px]" />
          </button>
        </div>
        <p className="text-[13px] text-mute">고른 꿈의 제목·카테고리·목표 시기·이룸 여부만 링크에 담겨요.</p>
        <button
          type="button"
          className="btn self-start text-sm"
          onClick={() => setSelected(new Set(allOn ? [] : items.map((i) => i.id)))}
        >
          {allOn ? '모두 해제' : '모두 선택'}
        </button>
        <ul className="flex flex-col" aria-label="공유할 꿈">
          {items.map((item) => (
            <li key={item.id} className="border-b border-line last:border-b-0">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-gold"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span className="min-w-0 break-words">{item.title}</span>
              </label>
            </li>
          ))}
        </ul>
        {tooMany && (
          <p role="alert" className="text-sm text-danger">
            {`한 번에 ${MAX_LIST_ITEMS}개까지 나눌 수 있어요.`}
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary press sticky bottom-0"
          disabled={url === null}
          onClick={async () => {
            if (!url) return
            setNotice((await shareLink(url, buildListShareText(picked.length))) ?? '')
          }}
        >
          {picked.length === 0 ? '꿈을 골라 주세요' : `${picked.length}개 공유`}
        </button>
        <p role="status" className="min-h-5 text-center text-sm text-mute">
          {notice}
        </p>
      </div>
    </dialog>
  )
}
