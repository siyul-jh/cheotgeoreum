import { BucketItemInputSchema, type ItemValues } from '@/entities/bucket-item'

const ItemValuesSchema = BucketItemInputSchema.omit({ status: true })
const PREFIX = '1.'
// 카드는 말줄임 없이 전부 보이니 링크에도 전부 담는다. 스키마 한도를 모두 채운 항목(4바이트 글자)까지 받을 수 있는 상한
const MAX_PAYLOAD = 60_000
const MAX_JSON_BYTES = 64 * 1024 // 압축 폭탄 방지: 압축 해제 누적 출력 상한

export async function encodeCard(item: ItemValues): Promise<string> {
  // 카드 칸만 담는다(id·status 등 다른 키는 링크에 넣지 않는다)
  const { title, why, category, targetPeriod, prerequisites, nextAction, companions } = item
  const json = JSON.stringify({ title, why, category, targetPeriod, prerequisites, nextAction, companions })
  const bytes = new TextEncoder().encode(json)
  const stream = new Response(bytes).body!.pipeThrough(new CompressionStream('deflate-raw'))
  const deflated = new Uint8Array(await new Response(stream).arrayBuffer())
  // ponytail: Uint8Array.toBase64는 iOS 16.4에 없어 btoa
  const base64 = btoa(Array.from(deflated, (b) => String.fromCharCode(b)).join(''))
  return PREFIX + base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

// 실패(접두사·base64·압축 해제·크기·JSON·스키마)는 모두 throw
export async function decodeCard(payload: string): Promise<ItemValues> {
  // 메신저·공유 시트가 URL 뒤에 공유 문구를 이어 붙이기도 해서(%20…) base64url 글자까지만 읽는다
  const body = payload.startsWith(PREFIX) ? /^[A-Za-z0-9_-]*/.exec(payload.slice(PREFIX.length))![0] : ''
  if (body.length === 0 || body.length > MAX_PAYLOAD) throw new Error('알 수 없는 공유 링크')
  const base64 = body.replaceAll('-', '+').replaceAll('_', '/')
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
