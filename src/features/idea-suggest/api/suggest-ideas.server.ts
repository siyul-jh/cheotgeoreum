import type { LanguageModel } from 'ai'
import { fieldLimits } from '@/entities/bucket-item'
import { generateStructured } from '@/shared/api/llm.server'
import type { LlmResult } from '@/shared/lib/llm-result'
import { IdeasOutputSchema, type SuggestIdeasInput } from './suggest-ideas'

const REQUEST_COUNT = 8
const RESULT_COUNT = 5

const SYSTEM = [
  '당신은 버킷리스트 아이디어를 제안하는 도우미다.',
  `제목은 ${fieldLimits.title}자 이내의 짧은 한 줄로, 서로 겹치지 않게 쓴다.`,
  '자연스러운 한국어로 쓴다.',
].join('\n')

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')

// 기존 제목과 같거나 결과 안에서 중복된 것을 지운다(전체 반환)
export function dedupeIdeas(ideas: string[], existingTitles: string[]): string[] {
  const seen = new Set(existingTitles.map(normalize))
  return ideas.filter((idea) => {
    const key = normalize(idea)
    if (key === '' || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function runSuggestIdeas(input: SuggestIdeasInput, model: LanguageModel): Promise<LlmResult<string[]>> {
  const { keyword, category, existingTitles } = input
  const prompt = [
    `버킷리스트 아이디어 ${REQUEST_COUNT}개를 제안해 줘.`,
    keyword ? `키워드: ${keyword}` : null,
    category ? `카테고리: ${category}` : null,
    `이미 있는 제목(겹치지 않게): ${JSON.stringify(existingTitles)}`,
  ]
    .filter((line) => line !== null)
    .join('\n')

  const result = await generateStructured({ model, schema: IdeasOutputSchema, system: SYSTEM, prompt, temperature: 0.9 })
  if (!result.ok) return result
  // 빠른 모델이 붙이는 앞 번호("1.")는 떼고, 한자(중국어)가 섞인 것은 버린다(8개 요청해 5개면 충분)
  const ideas = dedupeIdeas(
    result.data.ideas
      .map((idea) => idea.trim().replace(/^\d+[.)]\s*/, '').slice(0, fieldLimits.title))
      .filter((idea) => !/\p{Script=Han}/u.test(idea)),
    existingTitles,
  )
  return ideas.length >= RESULT_COUNT ? { ok: true, data: ideas.slice(0, RESULT_COUNT) } : { ok: false, code: 'invalid_response' }
}
