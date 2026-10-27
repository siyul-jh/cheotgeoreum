export function AiSuggestionRow({ text, onUse }: { text: string; onUse: () => void }) {
  return (
    <div className="surface flex items-center justify-between gap-3 bg-violet-50 px-3 py-2 text-sm">
      <span className="min-w-0 break-words">
        <span aria-hidden="true">✨ </span>
        <span className="sr-only">AI 제안: </span>
        {text}
      </span>
      <button type="button" onClick={onUse} className="btn shrink-0">
        사용
      </button>
    </div>
  )
}
