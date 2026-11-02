import { Pool } from 'pg'

// 서버 모듈 의존성 주입 형태(deps?: { query })
export type Query = (text: string, params: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>

let pool: Pool | undefined

// env는 호출 시점에 읽고 Pool은 한 번만 만든다. Neon pooled URL(-pooler)을 쓴다
export function getPool(): Pool {
  if (pool) return pool
  const { DATABASE_URL } = process.env
  if (!DATABASE_URL) throw new Error('DATABASE_URL이 설정되지 않았다')
  // ponytail: 서버리스 인스턴스마다 연결 3개까지
  pool = new Pool({ connectionString: DATABASE_URL, max: 3 })
  return pool
}

export function getQuery(): Query {
  const db = getPool()
  return async (text, params) => {
    const { rows, rowCount } = await db.query(text, params)
    return { rows, rowCount: rowCount ?? 0 }
  }
}

// 한 연결에서 begin~commit. 실패하면 rollback
export async function withTransaction<T>(fn: (query: Query) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    const result = await fn(async (text, params) => {
      const { rows, rowCount } = await client.query(text, params)
      return { rows, rowCount: rowCount ?? 0 }
    })
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}
