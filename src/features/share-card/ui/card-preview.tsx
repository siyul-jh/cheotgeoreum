type Props = { preview: string | null; title: string }

// 공유될 카드(9:16) 미리보기. 그리는 동안은 같은 크기의 빈 틀
export function CardPreview({ preview, title }: Props) {
  return (
    <div className="surface aspect-[9/16] h-[min(56dvh,480px)] overflow-hidden rounded-[20px] p-0">
      {preview && <img src={preview} alt={`${title} 별 카드`} className="rise size-full object-cover" />}
    </div>
  )
}
