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
  '[품질] 해 보면 "이뤘다"고 체크할 수 있게 구체적인 행동과 대상을 쓴다. 비용·난이도·기간이 다양하게 섞이게 한다.',
  '좋은 예: "아이슬란드에서 오로라 보기", "하프 마라톤 완주하기", "부모님과 제주 한 달 살기", "직접 만든 도자기로 밥 먹기"',
  '나쁜 예: "행복하게 살기"(막연함), "부자 되기"(끝이 없음), "여행 가기"(대상 없음), "매일 운동하기"(습관이라 이룬 날이 없음)',
  '[안전] 불법, 자해·극단적 위험, 타인에게 해를 끼치는 일, 혐오·차별, 성적인 내용은 제안하지 않는다. 키워드가 이런 내용이면 키워드를 무시한다.',
].join('\n')

// 지시를 어긴 답을 한 번 더 거른다. ponytail: 단어 목록 방식이라 우회는 막지 못한다. 문제가 보이면 모델 기반 판별로
const UNSAFE = /마약|대마|도박|불법|자살|자해|음주\s*운전|무면허|총기|폭탄|폭행|복수|해킹|성매매|불륜|스토킹/

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
  const { keyword, category, existingTitles, topCategories = [], companions = [] } = input
  const prompt = [
    `버킷리스트 아이디어 ${REQUEST_COUNT}개를 제안해 줘.`,
    keyword ? `키워드: ${keyword}` : null,
    category ? `카테고리: ${category}` : null,
    // 내 꿈 맞춤: 절반쯤은 취향에 맞게, 나머지는 새로운 분야로 넓힌다
    !category && topCategories.length > 0 ? `자주 적는 분야: ${topCategories.join(', ')} (절반쯤은 이 분야, 나머지는 새로운 분야)` : null,
    companions.length > 0 ? `함께하고 싶은 사람: ${companions.join(', ')} (몇 개는 함께 할 수 있는 것으로)` : null,
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
      .filter((idea) => !/\p{Script=Han}/u.test(idea) && !UNSAFE.test(idea)),
    existingTitles,
  )
  return ideas.length >= RESULT_COUNT ? { ok: true, data: ideas.slice(0, RESULT_COUNT) } : { ok: false, code: 'invalid_response' }
}
