import type { BucketItem, CategoryRecord, Tombstone } from '../model/schema'

type Side = { items: BucketItem[]; deleted: Tombstone[] }
type Row = { at: number; item: BucketItem | null }

const time = (iso: string) => Date.parse(iso)

function rows({ items, deleted }: Side): Map<string, Row> {
  const map = new Map<string, Row>()
  for (const d of deleted) map.set(d.id, { at: time(d.deletedAt), item: null })
  // 같은 id에 항목과 흔적이 같이 있으면 더 새 쪽(같으면 항목)
  for (const item of items) {
    const prev = map.get(item.id)
    if (!prev || time(item.updatedAt) >= prev.at) map.set(item.id, { at: time(item.updatedAt), item })
  }
  return map
}

// 서버 SQL과 같은 규칙: 이 기기 값은 서버 값보다 엄격히 새로울 때만 이기고, 같으면 서버 값을 남긴다.
// 흔적(삭제)이 이기면 그 꿈은 결과에서 빠진다. 순서는 이 기기 순서를 지키고 새 꿈은 뒤에 붙인다
export function mergeItems(local: Side, server: Side): { items: BucketItem[] } {
  const mine = rows(local)
  const theirs = rows(server)
  const winner = (id: string) => {
    const a = mine.get(id)
    const b = theirs.get(id)
    if (!b) return a?.item ?? null
    if (!a) return b.item
    return a.at > b.at ? a.item : b.item
  }
  const ids = [...new Set([...local.items.map((i) => i.id), ...server.items.map((i) => i.id)])]
  return { items: ids.map(winner).filter((i): i is BucketItem => i !== null) }
}

// 카테고리 기록도 같은 규칙(이름마다). 순서는 a 순서, b에만 있는 이름은 뒤에
export function mergeCategories(a: CategoryRecord[], b: CategoryRecord[]): CategoryRecord[] {
  const theirs = new Map(b.map((r) => [r.name, r]))
  const merged = a.map((r) => {
    const other = theirs.get(r.name)
    return other && time(r.at) <= time(other.at) ? other : r
  })
  const names = new Set(a.map((r) => r.name))
  return [...merged, ...b.filter((r) => !names.has(r.name))]
}
