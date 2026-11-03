import { DateTime } from 'luxon'

export function formatDate(iso: string): string {
  return DateTime.fromISO(iso).setLocale('ko').toFormat('M월 d일 (ccc)')
}

export function formatFullDate(iso: string): string {
  return DateTime.fromISO(iso).setLocale('ko').toFormat('yyyy년 M월 d일')
}
