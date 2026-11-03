// @vitest-environment node
import { MockLanguageModelV4 } from 'ai/test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dedupeIdeas, runSuggestIdeas } from './suggest-ideas.server'

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
const modelReturning = (ideas: string[]) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text: JSON.stringify({ ideas }) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage,
      warnings: [],
    }),
  })
const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

describe('dedupeIdeas', () => {
  it('공백·대소문자를 정규화해 기존 제목과 같은 것을 지운다', () => {
    expect(dedupeIdeas([' 제주  한달살기 ', '오로라 보기'], ['제주 한달살기'])).toEqual(['오로라 보기'])
    expect(dedupeIdeas(['Surf'], ['surf'])).toEqual([])
  })
  it('결과 안의 중복도 지운다', () => {
    expect(dedupeIdeas(['a', ' A ', 'b'], [])).toEqual(['a', 'b'])
  })
})

describe('runSuggestIdeas', () => {
  afterEach(() => vi.restoreAllMocks())

  it('8개가 오면 앞의 5개', async () => {
    const model = modelReturning(eight)
    expect(await runSuggestIdeas({ keyword: '바다', existingTitles: [] }, model)).toEqual({ ok: true, data: eight.slice(0, 5) })
    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain('바다')
  })
  it('기존 제목과 겹치는 것을 빼고도 5개면 성공', async () => {
    const result = await runSuggestIdeas({ existingTitles: ['a', 'b', 'c'] }, modelReturning(eight))
    expect(result).toEqual({ ok: true, data: ['d', 'e', 'f', 'g', 'h'] })
  })
  it('앞 번호는 떼고 한자가 섞인 것은 버린다', async () => {
    const ideas = ['1. 오로라 보기', '2) 제주 걷기', '열차 여행感受하기', 'd', 'e', 'f', 'g', 'h']
    const result = await runSuggestIdeas({ existingTitles: [] }, modelReturning(ideas))
    expect(result).toEqual({ ok: true, data: ['오로라 보기', '제주 걷기', 'd', 'e', 'f'] })
  })
  it('남은 것이 4개면 invalid_response', async () => {
    const result = await runSuggestIdeas({ existingTitles: ['a', 'b', 'c', 'd'] }, modelReturning(eight))
    expect(result).toEqual({ ok: false, code: 'invalid_response' })
  })
  it('오류면 code를 그대로 반환', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new TypeError('fetch failed')
      },
    })
    expect(await runSuggestIdeas({ existingTitles: [] }, model)).toEqual({ ok: false, code: 'llm_unreachable' })
  })
})

describe('runSuggestIdeas 하네스', () => {
  it('안전 규칙에 걸리는 아이디어는 버린다', async () => {
    const ideas = ['라스베이거스에서 도박으로 한탕', '음주 운전 없이 드라이브', 'c', 'd', 'e', 'f', 'g']
    const result = await runSuggestIdeas({ existingTitles: [] }, modelReturning(ideas))
    expect(result).toEqual({ ok: true, data: ['c', 'd', 'e', 'f', 'g'] })
  })
  it('지시문에 품질 기준·안전 규칙, 프롬프트에 자주 적는 분야와 함께할 사람을 넣는다', async () => {
    const model = modelReturning(eight)
    await runSuggestIdeas({ existingTitles: [], topCategories: ['여행', '건강'], companions: ['가족'] }, model)
    const sent = JSON.stringify(model.doGenerateCalls[0].prompt)
    for (const text of ['나쁜 예', '[안전]', '자주 적는 분야: 여행, 건강', '함께하고 싶은 사람: 가족']) expect(sent).toContain(text)
  })
  it('카테고리를 골랐으면 자주 적는 분야는 넣지 않는다', async () => {
    const model = modelReturning(eight)
    await runSuggestIdeas({ category: '배움', existingTitles: [], topCategories: ['여행'], companions: [] }, model)
    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).not.toContain('자주 적는 분야')
  })
})
