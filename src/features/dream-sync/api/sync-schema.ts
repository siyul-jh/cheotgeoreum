import { z } from 'zod'
import { CategoryRecordSchema, TombstoneSchema, type BucketItem, type CategoryRecord, type Tombstone } from '@/entities/bucket-item'
import { MAX_CATEGORY_RECORDS, SYNC_CHUNK_COUNT } from '@/shared/config/limits'

// 요청 조각 하나. 꿈은 서버가 하나씩 검사해 틀린 것만 rejected로 돌려준다(요청 전체를 실패시키지 않는다)
export const SyncChunkSchema = z.object({
  items: z.array(z.unknown()).max(SYNC_CHUNK_COUNT),
  deleted: z.array(TombstoneSchema).max(SYNC_CHUNK_COUNT),
  categories: z.array(CategoryRecordSchema).max(MAX_CATEGORY_RECORDS),
  // 마지막 조각이면 서버가 내 계정의 전체 상태를 돌려준다. cursor는 그 상태의 다음 페이지
  final: z.boolean(),
  cursor: z.string().max(100).nullable(),
  // 보내는 기기가 믿는 이 꿈들의 주인. 서버가 세션 사용자와 다르면 거절한다
  ownerId: z.string().max(100),
})
export type SyncChunk = z.infer<typeof SyncChunkSchema>

export type ServerSnapshot = {
  items: BucketItem[]
  deleted: Tombstone[]
  categories: CategoryRecord[]
  nextCursor: string | null
  serverNow: string
}

export type SyncResult = {
  // 처리한 흔적 id 전부(더 새 서버 편집에 져서 반영되지 않은 것도). 이 기기는 이제 지워도 된다
  ackedDeleted: string[]
  rejected: { id: string; reason: 'invalid' | 'limit' }[]
  snapshot: ServerSnapshot | null
}
