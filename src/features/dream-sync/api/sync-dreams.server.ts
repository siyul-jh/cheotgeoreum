import { BucketItemSchema, type BucketItem, type CategoryRecord, type Tombstone } from '@/entities/bucket-item'
import { withTransaction, type Query } from '@/shared/api/db.server'
import { MAX_CATEGORY_RECORDS, MAX_DREAMS, SYNC_CHUNK_BYTES } from '@/shared/config/limits'
import type { ServerSnapshot, SyncChunk, SyncResult } from './sync-schema'

type Tx = <T>(fn: (query: Query) => Promise<T>) => Promise<T>

// 병합 규칙(클라이언트 mergeItems와 같다): 행 버전 = greatest(updated_at, deleted_at).
// 들어온 값이 엄격히 클 때만 반영하고, 들어온 시각은 서버 now()로 자른다(기기 시계가 앞서도 미래 값이 남지 않게)
const UPSERT_EDITS = `
insert into dream (user_id, id, data, updated_at, deleted_at)
select $1, x.id, x.data, least(x.updated_at, now()), null
from jsonb_to_recordset($2::jsonb) as x(id text, data jsonb, updated_at timestamptz)
on conflict (user_id, id) do update set data = excluded.data, updated_at = excluded.updated_at, deleted_at = null
  where excluded.updated_at > greatest(dream.updated_at, coalesce(dream.deleted_at, '-infinity'))`

// 지운 흔적은 서버에 이미 있는 꿈에만 반영한다(서버에 없던 꿈은 다른 기기도 모르니 흔적이 필요 없다)
// 한계: 백업 파일로 서버를 거치지 않고 같은 id가 두 기기에 있으면, 한쪽에서 지운 뒤 다른 쪽의 첫 업로드로 되살아날 수 있다
// ponytail: 흔적 행은 지우지 않고 쌓인다. 늘어나면 deleted_at < now() - 90일 정리를 크론에 추가(그보다 오래 쉰 기기는 지운 꿈을 되살릴 수 있다)
const APPLY_DELETES = `
update dream set data = null, deleted_at = least(x.deleted_at, now())
from jsonb_to_recordset($2::jsonb) as x(id text, deleted_at timestamptz)
where dream.user_id = $1 and dream.id = x.id
  and least(x.deleted_at, now()) > greatest(dream.updated_at, coalesce(dream.deleted_at, '-infinity'))`

const UPSERT_CATEGORIES = `
insert into category_log (user_id, name, at, deleted)
select $1, x.name, least(x.at, now()), x.deleted
from jsonb_to_recordset($2::jsonb) as x(name text, at timestamptz, deleted boolean)
on conflict (user_id, name) do update set at = excluded.at, deleted = excluded.deleted
  where excluded.at > category_log.at`

const iso = (v: unknown) => new Date(v as string | Date).toISOString()
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).byteLength

// 같은 키가 한 요청에 여러 번 오면 on conflict가 한 행을 두 번 고치려다 실패한다 → 가장 새 것만 남긴다
function latest<T>(list: T[], key: (x: T) => string, at: (x: T) => string): T[] {
  const map = new Map<string, T>()
  for (const x of list) {
    const prev = map.get(key(x))
    if (!prev || Date.parse(at(x)) >= Date.parse(at(prev))) map.set(key(x), x)
  }
  return [...map.values()]
}

export async function runSync(userId: string, chunk: SyncChunk, deps: { tx?: Tx } = {}): Promise<SyncResult> {
  // 이 기기 꿈의 주인이 아닌 계정으로는 받지 않는다(다른 창에서 계정을 바꾼 뒤 남은 탭 등)
  if (chunk.ownerId !== userId) throw new Error('OWNER_MISMATCH')
  const tx: Tx = deps.tx ?? withTransaction
  return tx(async (query) => {
    // 같은 사용자의 동기화는 한 번에 하나(상한 계산·시각 비교가 엇갈리지 않게)
    await query('select pg_advisory_xact_lock(hashtext($1))', [userId])
    const rejected: SyncResult['rejected'] = []
    const valid: BucketItem[] = []
    for (const raw of chunk.items) {
      const parsed = BucketItemSchema.safeParse(raw)
      if (parsed.success) valid.push(parsed.data)
      else {
        const id = typeof raw === 'object' && raw !== null && 'id' in raw && typeof raw.id === 'string' ? raw.id : ''
        rejected.push({ id, reason: 'invalid' })
      }
    }

    // 상한: 이미 살아 있는 꿈의 편집은 받고, 새 꿈은 살아 있는 수가 상한 아래일 때만
    const { rows: liveRows } = await query('select id from dream where user_id = $1 and data is not null', [userId])
    const live = new Set(liveRows.map((r) => (r as { id: string }).id))
    const accepted = latest(valid, (i) => i.id, (i) => i.updatedAt).filter((item) => {
      if (live.has(item.id) || live.size < MAX_DREAMS) {
        live.add(item.id)
        return true
      }
      rejected.push({ id: item.id, reason: 'limit' })
      return false
    })
    if (accepted.length > 0) {
      const records = accepted.map((item) => ({ id: item.id, data: item, updated_at: item.updatedAt }))
      await query(UPSERT_EDITS, [userId, JSON.stringify(records)])
    }

    const deleted = latest(chunk.deleted, (d) => d.id, (d) => d.deletedAt)
    if (deleted.length > 0) {
      await query(APPLY_DELETES, [userId, JSON.stringify(deleted.map((d) => ({ id: d.id, deleted_at: d.deletedAt })))])
    }

    const { rows: nameRows } = await query('select name from category_log where user_id = $1', [userId])
    const names = new Set(nameRows.map((r) => (r as { name: string }).name))
    const categories = latest(chunk.categories, (c) => c.name, (c) => c.at).filter((c) => {
      if (!names.has(c.name) && names.size >= MAX_CATEGORY_RECORDS) return false
      names.add(c.name)
      return true
    })
    if (categories.length > 0) await query(UPSERT_CATEGORIES, [userId, JSON.stringify(categories)])

    return {
      ackedDeleted: chunk.deleted.map((d) => d.id),
      rejected,
      snapshot: chunk.final ? await readSnapshot(query, userId, chunk.cursor) : null,
    }
  })
}

// 내 계정의 전체 상태를 id 순으로 1MB까지. 넘치면 nextCursor로 이어 받는다(id 기준이라 서버 시각과 무관)
async function readSnapshot(query: Query, userId: string, cursor: string | null): Promise<ServerSnapshot> {
  // 한 트랜잭션 연결이라 차례로(동시에 보내면 pg가 경고하고 pg 9에서 막힌다)
  const { rows } = await query('select id, data, updated_at, deleted_at from dream where user_id = $1 and id > $2 order by id', [userId, cursor ?? ''])
  const { rows: categoryRows } = await query('select name, at, deleted from category_log where user_id = $1 order by name', [userId])
  const { rows: nowRows } = await query('select now() as now', [])
  const items: BucketItem[] = []
  const deleted: Tombstone[] = []
  let size = 0
  let lastId: string | null = null
  let nextCursor: string | null = null
  for (const raw of rows) {
    const row = raw as { id: string; data: BucketItem | null; updated_at: unknown; deleted_at: unknown }
    const entry = row.data ? { ...row.data, updatedAt: iso(row.updated_at) } : { id: row.id, deletedAt: iso(row.deleted_at) }
    size += bytes(entry)
    if (size > SYNC_CHUNK_BYTES && lastId !== null) {
      nextCursor = lastId
      break
    }
    if (row.data) items.push(entry as BucketItem)
    else deleted.push(entry as Tombstone)
    lastId = row.id
  }
  const categories = categoryRows.map((raw) => {
    const r = raw as { name: string; at: unknown; deleted: boolean }
    return { name: r.name, at: iso(r.at), deleted: r.deleted } satisfies CategoryRecord
  })
  return { items, deleted, categories, nextCursor, serverNow: iso((nowRows[0] as { now: unknown }).now) }
}
