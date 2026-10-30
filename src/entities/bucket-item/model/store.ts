import { create } from 'zustand'
import { z } from 'zod'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import {
  DEFAULT_CATEGORIES,
  UNCATEGORIZED_FILTER,
  UNCATEGORIZED_LABEL,
  fieldLimits,
  BucketItemSchema,
  PeriodPointSchema,
  type BucketItem,
  type BucketItemInput,
} from './schema'

export const STORAGE_KEY = 'cheotgeoreum:v1'
const STORE_VERSION = 2

export type BucketStore = {
  items: BucketItem[]
  customCategories: string[]
  addItem: (input: BucketItemInput) => string
  updateItem: (id: string, input: BucketItemInput) => void
  deleteItem: (id: string) => void
  addCategory: (name: string) => boolean
  deleteCategory: (name: string) => void
}

let requestedPersist = false
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
function migrate(persisted: unknown, version: number): unknown {
  // 모르는 version(더 새 앱이 저장한 것 등)은 throw: 모르는 형태를 메모리에 올리지 않는다. 저장소 쓰기는 guardNewer가 막는다
  if (version !== 1) throw new Error(`알 수 없는 저장 version ${version}`)
  if (typeof persisted !== 'object' || persisted === null || !('items' in persisted) || !Array.isArray(persisted.items))
    return persisted
  const items: unknown[] = persisted.items.map((item: unknown) => {
    if (typeof item !== 'object' || item === null || !('targetPeriod' in item)) return item
    const at = PeriodPointSchema.safeParse(item.targetPeriod)
    return { ...item, targetPeriod: at.success ? { kind: 'start', at: at.data } : null }
  })
  return { ...persisted, items }
}

export const useBucketStore = create<BucketStore>()(
  persist(
    (set, get) => ({
      items: [],
      customCategories: [],
      addItem: (input) => {
        const id = crypto.randomUUID()
        set((s) => ({ items: [...s.items, { ...input, id, createdAt: new Date().toISOString() }] }))
        requestPersistOnce()
        return id
      },
      updateItem: (id, input) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...input } : i)) })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      addCategory: (raw) => {
        const name = raw.trim()
        const taken = [...DEFAULT_CATEGORIES, ...get().customCategories, UNCATEGORIZED_LABEL, UNCATEGORIZED_FILTER]
        if (name.length < 1 || name.length > fieldLimits.category || taken.includes(name)) return false
        set((s) => ({ customCategories: [...s.customCategories, name] }))
        return true
      },
      deleteCategory: (name) => {
        if (!get().customCategories.includes(name)) return
        set((s) => ({
          customCategories: s.customCategories.filter((c) => c !== name),
          items: s.items.map((i) => (i.category === name ? { ...i, category: null } : i)),
        }))
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
        return {
          ...current,
          // ponytail: 배열 여부만 본다. 항목 형식은 저장 시 safeParse가 지킨다
          items: 'items' in persisted && Array.isArray(persisted.items) ? (persisted.items as BucketItem[]) : [],
          customCategories:
            'customCategories' in persisted && Array.isArray(persisted.customCategories) ? (persisted.customCategories as string[]) : [],
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
  items: z.array(BucketItemSchema),
  customCategories: z.array(z.string().trim().min(1).max(fieldLimits.category)).default([]),
})

// 백업 파일은 persist 저장값과 같은 모양
export const serializeBackup = ({ items, customCategories }: BackupData): string =>
  JSON.stringify({ state: { items, customCategories }, version: STORE_VERSION })

// 외부 입력: 형식이 어긋나면 throw. version 1은 migrate를 거쳐 v2로 본다
export function parseBackup(text: string): BackupData {
  const raw: unknown = JSON.parse(text)
  const { state, version } = z.object({ state: z.object({}).loose(), version: z.number() }).parse(raw)
  if (version !== 1 && version !== STORE_VERSION) throw new Error(`알 수 없는 백업 version ${version}`)
  return BackupSchema.parse(version === 1 ? migrate(state, 1) : state)
}

// 더 새 앱의 저장값이면 guardNewer가 쓰기를 버리므로 가져오기를 막는다
export const canImport = (): boolean => !isNewer(window.localStorage.getItem(STORAGE_KEY))
