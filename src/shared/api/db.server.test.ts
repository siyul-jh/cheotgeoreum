// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest'
import { getPool } from './db.server'

afterEach(() => vi.unstubAllEnvs())

test('getPool: DATABASE_URL을 호출 시점에 읽고 Pool은 한 번만 만든다', () => {
  vi.stubEnv('DATABASE_URL', '')
  expect(() => getPool()).toThrow('DATABASE_URL')
  vi.stubEnv('DATABASE_URL', 'postgres://u:p@localhost:5432/test')
  const pool = getPool()
  expect(pool.options.max).toBe(3)
  expect(getPool()).toBe(pool)
})
