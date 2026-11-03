import { DateTime } from 'luxon'
import type { TargetPeriod } from '../model/schema'

const COUNTDOWN = [7, 3, 1, 0] // 그날까지 남은 일수
const day = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' })
const hasMonth = (point: string) => point.length === 7
// 연만 있으면 1월 1일·12월 31일, 연-월이면 그 달 1일·말일
const startOf = (point: string) => day(hasMonth(point) ? `${point}-01` : `${point}-01-01`)
const endOf = (point: string) => (hasMonth(point) ? day(`${point}-01`).endOf('month') : day(`${point}-12-31`)).startOf('day')
const daysUntil = (target: DateTime, today: DateTime) => Math.round(target.diff(today, 'days').days)

// 기간 D일의 남은 일수가 절반이 될 때마다: 100 → 50, 25, 12. 7일 이하부터는 카운트다운이 맡는다
export function halvings(totalDays: number): number[] {
  const out: number[] = []
  for (let r = Math.floor(totalDays / 2); r > 7; r = Math.floor(r / 2)) out.push(r)
  return out
}

// 오늘(서울 날짜 yyyy-MM-dd)이 이 목표 시기의 알림 날인지. 연도가 없으면(목표 시기 없음) 보내지 않는다
export function shouldRemind(period: TargetPeriod | null, todayIso: string): boolean {
  if (!period) return false
  const today = day(todayIso)
  const firstOfMonth = today.day === 1
  const lastOfMonth = today.hasSame(today.endOf('month'), 'day')
  switch (period.kind) {
    case 'start':
      // 이때쯤 YYYY: 그 해 매달 1일
      if (!hasMonth(period.at)) return firstOfMonth && today.year === Number(period.at)
      return COUNTDOWN.includes(daysUntil(startOf(period.at), today))
    case 'end':
      // 이때까지 YYYY: 그 해 말까지 매달 말일
      if (!hasMonth(period.at)) return lastOfMonth && today <= endOf(period.at)
      return COUNTDOWN.includes(daysUntil(endOf(period.at), today))
    case 'range': {
      if (period.from === null) return false
      const start = startOf(period.from)
      // 끝이 없거나 어느 쪽이든 월이 없으면 기간 안에서 매달 1일
      // ponytail: 끝이 없는(…부터) 기간은 완료·포기 전까지 매달 간다
      if (period.to === null || !hasMonth(period.from) || !hasMonth(period.to))
        return firstOfMonth && today >= start && (period.to === null || today <= endOf(period.to))
      const end = endOf(period.to)
      const left = daysUntil(end, today)
      return (
        COUNTDOWN.includes(daysUntil(start, today)) ||
        COUNTDOWN.includes(left) ||
        halvings(daysUntil(end, start)).includes(left)
      )
    }
  }
}
