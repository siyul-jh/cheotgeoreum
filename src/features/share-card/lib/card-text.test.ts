import { describe, expect, it } from 'vitest'
import { buildShareText, cardFileName, wrapLines } from './card-text'

// 한 글자 = 너비 1
const measure = (s: string) => Array.from(s).length

describe('buildShareText', () => {
  it('목표 시기가 없으면 제목까지만', () => {
    expect(buildShareText({ title: '오로라 보기', targetPeriod: null })).toBe('내 버킷리스트에 새 별이 떴어요 ✦ 오로라 보기')
  })
  it('목표 시기가 있으면 괄호로 붙인다', () => {
    expect(buildShareText({ title: '오로라 보기', targetPeriod: { kind: 'start', at: '2027-03' } })).toBe(
      '내 버킷리스트에 새 별이 떴어요 ✦ 오로라 보기 (2027년 3월쯤)',
    )
    expect(buildShareText({ title: '마라톤', targetPeriod: { kind: 'end', at: '2028' } })).toBe(
      '내 버킷리스트에 새 별이 떴어요 ✦ 마라톤 (2028년까지)',
    )
    expect(buildShareText({ title: '세계 일주', targetPeriod: { kind: 'range', from: '2027-02', to: '2027-08' } })).toBe(
      '내 버킷리스트에 새 별이 떴어요 ✦ 세계 일주 (2027년 2월 ~ 2027년 8월)',
    )
  })
})

describe('cardFileName', () => {
  it('제목 앞 20자로 파일 이름을 만든다', () => {
    expect(cardFileName('오로라 보기')).toBe('첫걸음-오로라 보기.png')
    expect(cardFileName('가'.repeat(30))).toBe(`첫걸음-${'가'.repeat(20)}.png`)
  })
  it('파일 이름에 못 쓰는 문자와 제어문자를 뺀다', () => {
    expect(cardFileName('a/b:c?')).toBe('첫걸음-abc.png')
    expect(cardFileName('\\|*"<>\u0000\n\u007f끝')).toBe('첫걸음-끝.png')
  })
})

describe('wrapLines', () => {
  it('짧으면 한 줄', () => {
    expect(wrapLines('오로라 보기', 10, 3, measure)).toEqual(['오로라 보기'])
  })
  it('띄어쓰기에서 줄을 바꾼다', () => {
    expect(wrapLines('제주도 한 달 살기', 6, 3, measure)).toEqual(['제주도 한', '달 살기'])
  })
  it('한 줄보다 긴 단어는 글자 단위로 자른다', () => {
    expect(wrapLines('가나다라마바사', 3, 3, measure)).toEqual(['가나다', '라마바', '사'])
  })
  it('줄 수를 넘으면 마지막 줄을 말줄임한다', () => {
    const lines = wrapLines('가'.repeat(20), 5, 3, measure)
    expect(lines).toEqual(['가가가가가', '가가가가가', '가가가가…'])
    expect(lines.every((l) => measure(l) <= 5)).toBe(true)
  })
  it('줄바꿈·연속 공백은 한 칸으로 본다', () => {
    expect(wrapLines('하늘이\n\n보고  싶어서', 20, 3, measure)).toEqual(['하늘이 보고 싶어서'])
  })
})
