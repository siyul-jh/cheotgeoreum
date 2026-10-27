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
    { name: STORAGE_KEY, version: 1 },
  ),
)

export const selectCategories = (s: BucketStore): string[] => [...DEFAULT_CATEGORIES, ...s.customCategories]

export const selectCompanionNames = (s: BucketStore): string[] =>
  [...new Set(s.items.flatMap((i) => i.companions))].sort()
