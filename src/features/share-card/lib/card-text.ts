import { type BucketItemInput, formatFieldValue } from '@/entities/bucket-item'

type ShareItem = Pick<BucketItemInput, 'title' | 'targetPeriod'>

export function buildShareText({ title, targetPeriod }: ShareItem): string {
  const period = targetPeriod ? ` (${formatFieldValue('targetPeriod', { targetPeriod })})` : ''
  return `내 버킷리스트에 새 별이 떴어요 ✦ ${title}${period}`
}

export function cardFileName(title: string): string {
  return `첫걸음-${Array.from(title).slice(0, 20).join('')}.png`
}

// 띄어쓰기에서 줄을 바꾸고, 한 줄보다 긴 단어는 글자 단위로 자른다. maxLines를 넘으면 마지막 줄 끝을 …로
export function wrapLines(text: string, maxWidth: number, maxLines: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.trim().split(/\s+/)) {
    const joined = line ? `${line} ${word}` : word
    if (measure(joined) <= maxWidth) {
      line = joined
      continue
    }
    if (line) lines.push(line)
    line = ''
    for (const ch of word) {
      if (line && measure(line + ch) > maxWidth) {
        lines.push(line)
        line = ch
      } else line += ch
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines

  const kept = lines.slice(0, maxLines)
  let last = Array.from(kept[maxLines - 1])
  while (last.length > 0 && measure(`${last.join('').trimEnd()}…`) > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last.join('').trimEnd()}…`
  return kept
}
