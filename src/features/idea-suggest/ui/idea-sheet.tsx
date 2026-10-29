import { useEffect, useId, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { fieldLimits, selectCategories, useBucketStore } from '@/entities/bucket-item'
import { LLM_ERROR_MESSAGES } from '@/shared/lib/llm-result'
import { XIcon } from '@/shared/ui/x-icon'
import { useSuggestIdeas } from '../model/use-suggest-ideas'

type Props = { onPick: (title: string) => void; onClose: () => void }

export function IdeaSheet({ onPick, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const keywordId = useId()
  const categoryId = useId()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const categories = useBucketStore(useShallow(selectCategories))
  const titles = useBucketStore(useShallow((s) => s.items.map((i) => i.title)))
  const { request, status, ideas, error } = useSuggestIdeas()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label="아이디어 추천"
      onClose={onClose}
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
          onClick={() =>
            request({
              keyword: keyword.trim() || undefined,
              category: category || undefined,
              existingTitles: titles.slice(-500),
            })
          }
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
                  onClick={() => onPick(idea)}
                >
                  {idea}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  )
}
