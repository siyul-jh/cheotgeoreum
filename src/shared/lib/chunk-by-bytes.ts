// 목록을 JSON 바이트 합계 maxBytes, 개수 maxCount 이하 조각으로 나눈다. 혼자서 maxBytes를 넘는 값은 단독 조각
export function chunkByBytes<T>(list: T[], maxBytes: number, maxCount = 1000): T[][] {
  const encoder = new TextEncoder()
  const chunks: T[][] = []
  let current: T[] = []
  let bytes = 0
  for (const value of list) {
    const size = encoder.encode(JSON.stringify(value)).byteLength + 1 // 쉼표
    if (current.length > 0 && (bytes + size > maxBytes || current.length >= maxCount)) {
      chunks.push(current)
      current = []
      bytes = 0
    }
    current.push(value)
    bytes += size
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}
