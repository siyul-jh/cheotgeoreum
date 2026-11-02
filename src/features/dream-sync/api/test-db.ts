import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import type { Query } from '@/shared/api/db.server'

// 테스트 전용: 운영과 같은 스키마를 올린 실제 Postgres(WASM)와 트랜잭션 함수
export async function createTestDb() {
  const db = new PGlite()
  await db.exec(readFileSync('db/auth-schema.sql', 'utf8'))
  await db.exec(readFileSync('db/schema.sql', 'utf8'))
  await db.exec(`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values
    ('u1', 'a', 'a@x', true, now(), now()), ('u2', 'b', 'b@x', true, now(), now())`)
  const tx = <T>(fn: (query: Query) => Promise<T>) =>
    db.transaction((t) =>
      fn(async (text, params) => {
        const r = await t.query(text, params)
        return { rows: r.rows, rowCount: r.affectedRows ?? 0 }
      }),
    )
  return { db, tx }
}
