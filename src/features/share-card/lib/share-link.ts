import { BucketItemInputSchema, type ItemValues } from '@/entities/bucket-item'

const ItemValuesSchema = BucketItemInputSchema.omit({ status: true })
const PREFIX = '1.'
const MAX_PAYLOAD = 8000
const MAX_JSON_BYTES = 32 * 1024 // 압축 폭탄 방지: 압축 해제 누적 출력 상한

// code point 단위로 자른 뒤 스키마처럼 trim
const clip = (s: string, n: number) => Array.from(s).slice(0, n).join('').trim()

// 카드에 보이는 범위로만 잘라 URL 길이를 묶는다(최악 ~4KB). 빈 항목은 스키마 min(1)에 걸리니 버린다
export function clipForCard(item: ItemValues): ItemValues {
  return {
    title: item.title.trim(),
    why: clip(item.why, 200),
    category: item.category,
    targetPeriod: item.targetPeriod,
    prerequisites: item.prerequisites
      .slice(0, 10)
      .map((p) => ({ text: clip(p.text, 60), done: p.done }))
      .filter((p) => p.text),
    nextAction: { text: clip(item.nextAction.text, 100), dueDate: item.nextAction.dueDate },
    companions: item.companions
      .slice(0, 10)
      .map((c) => c.trim())
      .filter(Boolean),
  }
}

export async function encodeCard(item: ItemValues): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(clipForCard(item)))
  const stream = new Response(bytes).body!.pipeThrough(new CompressionStream('deflate-raw'))
  const deflated = new Uint8Array(await new Response(stream).arrayBuffer())
  // ponytail: Uint8Array.toBase64는 iOS 16.4에 없어 btoa
  const base64 = btoa(Array.from(deflated, (b) => String.fromCharCode(b)).join(''))
  return PREFIX + base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

// 실패(접두사·base64·압축 해제·크기·JSON·스키마)는 모두 throw
export async function decodeCard(payload: string): Promise<ItemValues> {
  if (payload.length > MAX_PAYLOAD || !payload.startsWith(PREFIX)) throw new Error('알 수 없는 공유 링크')
  const base64 = payload.slice(PREFIX.length).replaceAll('-', '+').replaceAll('_', '/')
  const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (c) => c.charCodeAt(0))

  const reader = new Response(bytes).body!.pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (let r = await reader.read(); !r.done; r = await reader.read()) {
    size += r.value.byteLength
    if (size > MAX_JSON_BYTES) {
      await reader.cancel()
      throw new Error('공유 링크가 너무 커요')
    }
    chunks.push(r.value)
  }
  const json = new Uint8Array(size)
  chunks.reduce((offset, chunk) => (json.set(chunk, offset), offset + chunk.byteLength), 0)
  return ItemValuesSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json)))
}

export function shareUrl(payload: string): string {
  return `${location.origin}/s#${payload}`
}
