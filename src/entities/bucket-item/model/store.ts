import { create } from 'zustand'
import { z } from 'zod'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { mergeCategories, mergeItems } from '../lib/merge-items'
import {
  DEFAULT_CATEGORIES,
  UNCATEGORIZED_FILTER,
  UNCATEGORIZED_LABEL,
  fieldLimits,
  BucketItemSchema,
  CategoryRecordSchema,
  PeriodPointSchema,
  TombstoneSchema,
  type BucketItem,
  type BucketItemInput,
  type CategoryRecord,
  type Tombstone,
} from './schema'

export const STORAGE_KEY = 'cheotgeoreum:v1'
const STORE_VERSION = 3

// 서버가 돌려준 내 계정의 전체 상태(동기화 응답을 모두 모은 것)
export type SyncSnapshot = { items: BucketItem[]; deleted: Tombstone[]; categories: CategoryRecord[]; serverNow: string }

export type BucketStore = {
  items: BucketItem[]
  // 내 카테고리 이름(화면용 순서). categoryLog는 동기화용 추가·삭제 기록
  customCategories: string[]
  categoryLog: CategoryRecord[]
  // 이 기기에서 지웠고 아직 서버가 받지 않은 꿈
  deletedIds: Tombstone[]
  // 이 기기의 꿈이 속한 계정. null이면 아직 어느 계정에도 올리지 않았다
  ownerId: string | null
  addItem: (input: BucketItemInput) => string
  updateItem: (id: string, input: BucketItemInput) => void
  deleteItem: (id: string) => void
  addCategory: (name: string) => boolean
  renameCategory: (from: string, to: string) => boolean
  deleteCategory: (name: string) => void
  importBackup: (data: BackupData) => void
  claimLocalData: (userId: string) => void
  clearLocalData: () => void
  applySynced: (snapshot: SyncSnapshot, ackedDeleted: string[]) => void
  // 이 기기의 꿈 전부를 지금(또는 after보다 1ms 뒤 중 늦은 쪽) 고친 것으로 만든다. 서버의 지운 흔적보다 새로워져 다시 올라간다
  touchAll: (after?: string) => void
}

// 동기화 결과를 적용하는 동안 true. 동기화 훅이 이 변경을 사용자 변경으로 세지 않게 한다
export const syncFlags = { applying: false }

const now = () => new Date().toISOString()
const plus1ms = (iso: string) => new Date(Date.parse(iso) + 1).toISOString()

// 스냅샷 안의 가장 늦은 시각(서버 now()와 그 뒤에 커밋돼 함께 읽힌 행까지)
export function latestIn(snapshot: SyncSnapshot): string {
  const times = [snapshot.serverNow, ...snapshot.items.map((i) => i.updatedAt), ...snapshot.deleted.map((d) => d.deletedAt), ...snapshot.categories.map((c) => c.at)]
  // spread 대신 reduce: 흔적이 수만 개여도 인자 수 한계에 걸리지 않게
  return new Date(times.reduce((max, t) => Math.max(max, Date.parse(t)), 0)).toISOString()
}
const minIso = (a: string, b: string) => (Date.parse(a) <= Date.parse(b) ? a : b)
// 카테고리 기록 한 줄을 바꾼다(같은 이름의 예전 기록은 지우고 맨 뒤에)
const logRecord = (log: CategoryRecord[], name: string, deleted: boolean): CategoryRecord[] => [
  ...log.filter((r) => r.name !== name),
  { name, at: now(), deleted },
]

let requestedPersist = false
// 기본·내 카테고리, 미분류 이름·필터 값과 겹치지 않는 1~30자
const canUseName = (name: string, custom: string[]) =>
  name.length >= 1 &&
  name.length <= fieldLimits.category &&
  ![...DEFAULT_CATEGORIES, ...custom, UNCATEGORIZED_LABEL, UNCATEGORIZED_FILTER].includes(name)

function requestPersistOnce() {
  if (requestedPersist) return
  requestedPersist = true
  // ponytail: 백업 대신 eviction 완화만
  void navigator.storage?.persist?.()
}

// 더 새 앱이 저장한 데이터(version > STORE_VERSION)에는 쓰지 않는다.
// migrate가 throw하면 메모리가 빈 채로 남는데, 이 가드가 없으면 다음 set이 그 빈 상태로 저장소를 덮어쓴다
// ponytail: 막힌 쓰기는 알리지 않는다(새로고침하면 사라짐). 이전 빌드로 되돌릴 일이 생기면 읽기 전용 안내를 추가
const isNewer = (raw: string | null) => {
  try {
    const version: unknown = raw === null ? null : (JSON.parse(raw) as { version?: unknown }).version
    return typeof version === 'number' && version > STORE_VERSION
  } catch {
    return false
  }
}

function guardNewer(storage: Storage): StateStorage {
  return {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => {
      if (!isNewer(storage.getItem(name))) storage.setItem(name, value)
    },
    removeItem: (name) => storage.removeItem(name),
  }
}

// version 1 → 2: targetPeriod 문자열을 start로. 항목은 하나도 버리지 않고, 형식이 이상한 값만 null로 둔다
function v1ToV2(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null || !('items' in persisted) || !Array.isArray(persisted.items))
    return persisted
  const items: unknown[] = persisted.items.map((item: unknown) => {
    if (typeof item !== 'object' || item === null || !('targetPeriod' in item)) return item
    const at = PeriodPointSchema.safeParse(item.targetPeriod)
    return { ...item, targetPeriod: at.success ? { kind: 'start', at: at.data } : null }
  })
  return { ...persisted, items }
}

// version 2 → 3: 동기화 필드. updatedAt = createdAt, 내 카테고리는 아주 오래전 기록으로(다른 기기 기록이 이기게)
const EPOCH = '1970-01-01T00:00:00.000Z'
function v2ToV3(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted
  const items: unknown[] = 'items' in persisted && Array.isArray(persisted.items) ? persisted.items : []
  const custom: unknown[] = 'customCategories' in persisted && Array.isArray(persisted.customCategories) ? persisted.customCategories : []
  return {
    ...persisted,
    items: items.map((item) =>
      typeof item === 'object' && item !== null ? { ...item, updatedAt: 'createdAt' in item ? item.createdAt : EPOCH } : item,
    ),
    categoryLog: custom.filter((n): n is string => typeof n === 'string').map((name) => ({ name, at: EPOCH, deleted: false })),
    deletedIds: [],
    ownerId: null,
  }
}

function migrate(persisted: unknown, version: number): unknown {
  // 모르는 version(더 새 앱이 저장한 것 등)은 throw: 모르는 형태를 메모리에 올리지 않는다. 저장소 쓰기는 guardNewer가 막는다
  if (version < 1 || version > STORE_VERSION) throw new Error(`알 수 없는 저장 version ${version}`)
  let state = persisted
  if (version < 2) state = v1ToV2(state)
  if (version < 3) state = v2ToV3(state)
  const items = (state as { items?: unknown }).items
  console.info('[store] migrated', version, Array.isArray(items) ? items.length : 0)
  return state
}

export const useBucketStore = create<BucketStore>()(
  persist(
    (set, get) => ({
      items: [],
      customCategories: [],
      categoryLog: [],
      deletedIds: [],
      ownerId: null,
      addItem: (input) => {
        // randomUUID는 보안 컨텍스트(https·localhost)에만 있다. 같은 Wi-Fi의 http 주소로 열어도 저장되게 getRandomValues로 대신한다
        const id =
          crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
        const at = now()
        set((s) => ({ items: [...s.items, { ...input, id, createdAt: at, updatedAt: at }] }))
        requestPersistOnce()
        return id
      },
      updateItem: (id, input) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...input, updatedAt: now() } : i)) })),
      deleteItem: (id) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
          deletedIds: [...s.deletedIds.filter((d) => d.id !== id), { id, deletedAt: now() }],
        })),
      addCategory: (raw) => {
        const name = raw.trim()
        if (!canUseName(name, get().customCategories)) return false
        set((s) => ({ customCategories: [...s.customCategories, name], categoryLog: logRecord(s.categoryLog, name, false) }))
        return true
      },
      // 이름을 바꾸면 그 카테고리의 꿈도 따라 바뀐다. 자리(순서)는 그대로
      renameCategory: (from, raw) => {
        const name = raw.trim()
        const custom = get().customCategories
        if (name === from) return true
        if (!custom.includes(from) || !canUseName(name, custom)) return false
        const at = now()
        set((s) => ({
          customCategories: s.customCategories.map((c) => (c === from ? name : c)),
          categoryLog: logRecord(logRecord(s.categoryLog, from, true), name, false),
          items: s.items.map((i) => (i.category === from ? { ...i, category: name, updatedAt: at } : i)),
        }))
        return true
      },
      deleteCategory: (name) => {
        if (!get().customCategories.includes(name)) return
        const at = now()
        set((s) => ({
          customCategories: s.customCategories.filter((c) => c !== name),
          categoryLog: logRecord(s.categoryLog, name, true),
          items: s.items.map((i) => (i.category === name ? { ...i, category: null, updatedAt: at } : i)),
        }))
      },
      // 백업 가져오기: 더하고, 같은 꿈은 덮어쓴다. 지금 있는 꿈은 지우지 않는다(지운 흔적도 만들지 않는다)
      importBackup: (data) => {
        const at = now()
        const incoming = new Map(data.items.map((i) => [i.id, { ...i, updatedAt: at }]))
        set((s) => {
          const kept = s.items.map((i) => incoming.get(i.id) ?? i)
          const added = [...incoming.values()].filter((i) => !s.items.some((x) => x.id === i.id))
          const newNames = data.customCategories.filter((n) => canUseName(n, s.customCategories))
          return {
            items: [...kept, ...added],
            customCategories: [...s.customCategories, ...newNames],
            categoryLog: newNames.reduce((log, n) => logRecord(log, n, false), s.categoryLog),
            deletedIds: s.deletedIds.filter((d) => !incoming.has(d.id)),
          }
        })
      },
      // 이 기기의 꿈을 이 계정 것으로 삼는다. 남은 지운 흔적은 계정에도 반영한다
      claimLocalData: (userId) => set({ ownerId: userId }),
      clearLocalData: () => set({ items: [], customCategories: [], categoryLog: [], deletedIds: [], ownerId: null }),
      touchAll: (after) => {
        const at = after && Date.parse(plus1ms(after)) > Date.now() ? plus1ms(after) : now()
        set((s) => ({ items: s.items.map((i) => ({ ...i, updatedAt: at })) }))
      },
      applySynced: (snapshot, ackedDeleted) => {
        // 스냅샷보다 앞선 값(기기 시계가 빠르거나, 응답이 오는 동안 고친 것)은 스냅샷의 가장 늦은 시각+1ms로 자른다.
        // 서버의 어떤 값보다는 엄격히 새로워 이기되, 미래 시각으로 계속 이기지는 않게
        const ceiling = plus1ms(latestIn(snapshot))
        const clamp = <T>(list: T[], key: keyof T & string) =>
          list.map((x) => ({ ...x, [key]: minIso(x[key] as string, ceiling) }))
        syncFlags.applying = true
        try {
          set((s) => {
            const acked = new Set(ackedDeleted)
            const deletedIds = clamp(s.deletedIds, 'deletedAt')
            const { items } = mergeItems(
              { items: clamp(s.items, 'updatedAt'), deleted: deletedIds },
              { items: snapshot.items, deleted: snapshot.deleted },
            )
            const categoryLog = mergeCategories(clamp(s.categoryLog, 'at'), snapshot.categories)
            const live = categoryLog.filter((r) => !r.deleted).map((r) => r.name)
            return {
              items,
              categoryLog,
              customCategories: [...s.customCategories.filter((c) => live.includes(c)), ...live.filter((c) => !s.customCategories.includes(c))],
              deletedIds: deletedIds.filter((d) => !acked.has(d.id)),
            }
          })
        } finally {
          syncFlags.applying = false
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION, // version을 올리면 migrate도 함께: 없으면 빈 상태로 덮어써 전체 유실
      migrate,
      // 서버(SSR)에서는 window 참조가 throw해 createJSONStorage가 저장을 끈다(Node 26은 전역 localStorage가 undefined라 window로 확인)
      storage: createJSONStorage(() => guardNewer(window.localStorage)),
      // 항목 단위로 거르지 않는다: 버린 항목은 다음 set에서 저장소에서도 영구 유실된다
      merge: (persisted, current) => {
        // persisted가 비정상이면 메모리를 그대로 둔다. 비우면 다음 set이 저장소까지 덮어쓴다
        if (typeof persisted !== 'object' || persisted === null) return current
        const saved = persisted as Record<string, unknown>
        const arr = (key: string): unknown[] => (Array.isArray(saved[key]) ? saved[key] : [])
        const ownerId = typeof saved.ownerId === 'string' ? saved.ownerId : null
        return {
          ...current,
          // 꿈은 배열 여부만 본다(형식이 틀린 꿈도 버리지 않는다. 서버가 rejected로 알려 준다)
          items: arr('items') as BucketItem[],
          customCategories: arr('customCategories') as string[],
          // 동기화 기록은 틀린 줄만 버린다(하나가 틀려 요청 전체가 막히지 않게. 꿈 데이터는 아니다)
          categoryLog: arr('categoryLog').filter((r): r is CategoryRecord => CategoryRecordSchema.safeParse(r).success),
          deletedIds: arr('deletedIds').filter((d): d is Tombstone => TombstoneSchema.safeParse(d).success),
          ownerId,
        }
      },
    },
  ),
)

// 다른 탭이 저장하면 다시 읽는다. 안 하면 이 탭의 다음 set이 다른 탭 변경을 덮어쓴다
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) void useBucketStore.persist.rehydrate()
  })
}

export const selectCategories = (s: BucketStore): string[] => [...DEFAULT_CATEGORIES, ...s.customCategories]

export const selectCompanionNames = (s: BucketStore): string[] =>
  [...new Set(s.items.flatMap((i) => i.companions))].sort()

export type BackupData = Pick<BucketStore, 'items' | 'customCategories'>

const BackupSchema = z.object({
  // 같은 id가 여럿이면 수정·삭제가 여러 항목에 걸린다
  items: z.array(BucketItemSchema).refine((a) => new Set(a.map((i) => i.id)).size === a.length),
  customCategories: z.array(z.string().trim().min(1).max(fieldLimits.category)).default([]),
})

// 백업 파일은 persist 저장값과 같은 모양(꿈과 내 카테고리만)
export const serializeBackup = ({ items, customCategories }: BackupData): string =>
  JSON.stringify({ state: { items, customCategories }, version: STORE_VERSION })

// 외부 입력: 형식이 어긋나면 throw. 예전 version은 같은 migrate 체인을 거친다
export function parseBackup(text: string): BackupData {
  const raw: unknown = JSON.parse(text)
  const { state, version } = z.object({ state: z.object({}).loose(), version: z.number() }).parse(raw)
  if (version < 1 || version > STORE_VERSION) throw new Error(`알 수 없는 백업 version ${version}`)
  return BackupSchema.parse(version === STORE_VERSION ? state : migrate(state, version))
}

// 더 새 앱의 저장값이면 guardNewer가 쓰기를 버리므로 가져오기를 막는다
export const canImport = (): boolean => !isNewer(window.localStorage.getItem(STORAGE_KEY))
