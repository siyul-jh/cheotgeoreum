import { StarIcon } from './star-icon'

export function AiSuggestionRow({ text, onUse }: { text: string; onUse: () => void }) {
  return (
    <div className="drop flex items-center gap-3 rounded-[14px] bg-ai px-3.5 py-3">
      <StarIcon fill="currentColor" className="glow size-[18px] shrink-0 text-gold" />
      <span className="min-w-0 flex-1 break-words text-[15px]">
        <span className="sr-only">AI 제안: </span>
        {text}
      </span>
      <button
        type="button"
        onClick={onUse}
        className="press h-9 shrink-0 rounded-full border border-gold px-3.5 text-sm font-bold text-gold"
      >
        사용
      </button>
    </div>
  )
}

// AI 요청이 도는 동안 버튼 자리에 보인다. role=status라 화면 읽기 프로그램도 알린다.
// 회전은 모션 축소면 멈추고(motion-safe) 문구만 남는다
export function AiPendingRow() {
  return (
    <p role="status" className="drop flex min-h-11 items-center gap-3 rounded-[14px] bg-ai px-3.5 py-3 text-[15px]">
      <span aria-hidden="true" className="size-[18px] shrink-0 rounded-full border-2 border-gold border-t-transparent motion-safe:animate-spin" />
      <span className="min-w-0 flex-1">AI가 빈 칸을 채우고 있어요. 잠시만 기다려 주세요.</span>
    </p>
  )
}
