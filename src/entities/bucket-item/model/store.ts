import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_CATEGORIES,
  UNCATEGORIZED_FILTER,
  UNCATEGORIZED_LABEL,
  fieldLimits,
  type BucketItem,
  type BucketItemInput,
} from './schema'

export const STORAGE_KEY = 'cheotgeoreum:v1'

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
      version: 1, // version을 올리면 migrate 필수: 없으면 빈 상태로 덮어써 전체 유실
      // 항목 단위로 거르지 않는다: 버린 항목은 다음 set에서 저장소에서도 영구 유실된다
      merge: (persisted, current) => {
        // version 불일치(migrate 없음)면 persisted가 undefined로 온다. 메모리를 비우면 다음 set이 저장소까지 덮어쓴다
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
