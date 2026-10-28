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
