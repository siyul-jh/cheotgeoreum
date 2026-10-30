import { useEffect, useId, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { fieldLimits, selectCategories, useBucketStore } from '@/entities/bucket-item'
import { LLM_ERROR_MESSAGES } from '@/shared/lib/llm-result'
import { FloatingStatus, Spinner } from '@/shared/ui/floating-status'
import { XIcon } from '@/shared/ui/x-icon'
import { useSuggestIdeas } from '../model/use-suggest-ideas'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // category: 추천받을 때 고른 카테고리(상관없음이면 null)
  onPick: (title: string, category: string | null) => void
}

// 닫아도 마운트를 유지해 진행 중인 추천 요청과 결과를 지킨다(LLM 응답이 오래 걸릴 수 있다)
export function IdeaSheet({ open, onOpenChange, onPick }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const keywordId = useId()
  const categoryId = useId()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const categories = useBucketStore(useShallow(selectCategories))
  const titles = useBucketStore(useShallow((s) => s.items.map((i) => i.title)))
  const { request, status, ideas, error } = useSuggestIdeas()
  // 찾는 중에 닫았으면 아래쪽에 진행 상태를 띄운다. 결과를 본 뒤 닫으면 띄우지 않는다
  const [showStatus, setShowStatus] = useState(false)
  // [추천받기]는 요청하고 바로 닫는다. 닫힘 시점엔 status가 아직 pending으로 안 바뀌었을 수 있어 따로 표시한다
  const closingForRequest = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
    <dialog
      ref={ref}
      aria-label="아이디어 추천"
      onClose={() => {
        setShowStatus(closingForRequest.current || status === 'pending')
        closingForRequest.current = false
        onOpenChange(false)
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none md:mx-auto md:max-w-md rounded-t-[20px] border-t border-line bg-card p-4 text-ink backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="flex-1 font-title text-xl font-bold">아이디어 추천</h2>
          <button
            type="button"
            className="press flex size-11 items-center justify-center rounded-full bg-ai"
            aria-label="닫기"
            onClick={() => ref.current?.close()}
          >
            <XIcon className="size-[18px]" />
          </button>
        </div>
        <label htmlFor={keywordId} className="text-sm text-mute">
          키워드 (선택)
        </label>
        <input
          id={keywordId}
          className="field"
          value={keyword}
          maxLength={fieldLimits.keyword}
          placeholder="예: 바다, 혼자, 도전"
          onChange={(e) => setKeyword(e.target.value)}
        />
        <label htmlFor={categoryId} className="text-sm text-mute">
          카테고리 (선택)
        </label>
        <select id={categoryId} className="field select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">상관없음</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary press"
          disabled={status === 'pending'}
          onClick={() => {
            request({
              keyword: keyword.trim() || undefined,
              category: category || undefined,
              existingTitles: titles.slice(-500),
            })
            closingForRequest.current = true
            ref.current?.close()
          }}
        >
          {status === 'pending' ? '아이디어 찾는 중…' : status === 'ready' ? '다시 추천받기' : '추천받기'}
        </button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {LLM_ERROR_MESSAGES[error]}
          </p>
        )}
        {status === 'ready' && (
          <ul className="flex flex-col gap-2" aria-label="추천 아이디어">
            {ideas.map((idea) => (
              <li key={idea}>
                <button
                  type="button"
                  className="press drop min-h-12 w-full rounded-[14px] border border-edge bg-ai px-3.5 py-2.5 text-left"
                  onClick={() => onPick(idea, category || null)}
                >
                  {idea}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
    <FloatingStatus show={!open && showStatus}>
      {/* idle: [추천받기] 직후 아직 pending으로 바뀌기 전 */}
      {status === 'pending' || status === 'idle' ? (
        <>
          <Spinner />
          <span className="pr-3">아이디어를 찾고 있어요…</span>
        </>
      ) : (
        <>
          <span>{status === 'ready' ? '아이디어가 준비됐어요' : '아이디어를 가져오지 못했어요'}</span>
          <button type="button" className="btn btn-primary press h-9 px-4 text-sm" onClick={() => onOpenChange(true)}>
            보기
          </button>
        </>
      )}
    </FloatingStatus>
    </>
  )
}
