import { useEffect, useRef, useState } from 'react'
import { XIcon } from '@/shared/ui/x-icon'
import { copyText, shareTargets } from '../model/share-card'

type Props = { open: boolean; onClose: () => void; url: string; text: string }

// 기기 공유 창이 없을 때(https가 아닌 주소·공유 창 없는 브라우저) 여는 앱 공유 시트
export function ShareSheet({ open, onClose, url, text }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const copy = async () => {
    if (await copyText(url)) return setCopied('링크를 복사했어요')
    // ponytail: 복사까지 막힌 브라우저는 링크가 담긴 기본 입력창으로 직접 복사하게 한다
    window.prompt('이 링크를 길게 눌러 복사해 주세요', url)
  }

  return (
    <dialog
      ref={ref}
      aria-label="공유하기"
      onClose={() => {
        setCopied('')
        onClose()
      }}
      className="m-0 mt-auto w-full max-w-none rounded-t-[20px] border-t border-line bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-ink backdrop:bg-black/60 md:mx-auto md:max-w-md"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="flex-1 font-title text-xl font-bold">공유하기</h2>
          <button
            type="button"
            className="press flex size-11 items-center justify-center rounded-full bg-ai"
            aria-label="닫기"
            onClick={() => ref.current?.close()}
          >
            <XIcon className="size-[18px]" />
          </button>
        </div>
        <p className="break-words text-sm text-mute">{text}</p>
        <div className="grid grid-cols-2 gap-2">
          {shareTargets(url, text).map((t) => (
            <a
              key={t.label}
              href={t.href}
              target={t.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              className="btn press flex items-center justify-center"
            >
              {t.label}
            </a>
          ))}
          <button type="button" className="btn btn-primary press" onClick={() => void copy()}>
            링크 복사
          </button>
        </div>
        <p role="status" className="min-h-5 text-sm text-mute">
          {copied}
        </p>
      </div>
    </dialog>
  )
}
