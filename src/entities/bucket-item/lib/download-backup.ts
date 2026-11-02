import { DateTime } from 'luxon'
import { serializeBackup, useBucketStore } from '../model/store'

// 지금 꿈과 내 카테고리를 날짜 붙은 json 파일로 내려받는다
export function downloadBackup() {
  const { items, customCategories } = useBucketStore.getState()
  const url = URL.createObjectURL(new Blob([serializeBackup({ items, customCategories })], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `첫걸음-백업-${DateTime.now().toISODate()}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
