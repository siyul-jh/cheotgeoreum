import { type BucketItemInput, formatFieldValue } from '@/entities/bucket-item'

type ShareItem = Pick<BucketItemInput, 'title' | 'targetPeriod'>

export function buildShareText({ title, targetPeriod }: ShareItem): string {
  const period = targetPeriod ? ` (${formatFieldValue('targetPeriod', { targetPeriod })})` : ''
  return `내 버킷리스트에 새 별이 떴어요 ✦ ${title}${period}`
}

// 파일 이름에 못 쓰는 문자(\/:*?"<>|)와 제어문자는 뺀다
export function cardFileName(title: string): string {
  return `첫걸음-${Array.from(title.replace(/[\\/:*?"<>|\p{Cc}]/gu, '')).slice(0, 20).join('')}.png`
}

// 띄어쓰기에서 줄을 바꾸고, 한 줄보다 긴 단어는 글자 단위로 자른다. 카드 내용은 말줄임하지 않는다
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
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
  return lines
}
