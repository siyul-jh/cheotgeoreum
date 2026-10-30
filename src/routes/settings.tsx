import { Link, createFileRoute } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { useBucketStore } from '@/entities/bucket-item'
import { BackupActions } from '@/features/backup'
import { getThemePref, setThemePref, type ThemePref } from '@/shared/lib/theme'
import { XIcon } from '@/shared/ui/x-icon'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

const THEMES: [ThemePref, string][] = [
  ['system', '시스템 설정'],
  ['light', '라이트 · 태양'],
  ['dark', '다크 · 밤하늘'],
]

function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label="닫기" className="press flex size-11 shrink-0 items-center justify-center rounded-full bg-card">
          <XIcon className="size-[18px]" />
        </Link>
        <h1 className="font-title text-xl font-bold">설정</h1>
      </header>
      <ThemeSection />
      <CategorySection />
      <section aria-labelledby="settings-data" className="surface flex flex-col gap-1 p-4">
        <h2 id="settings-data" className="text-sm font-bold">
          데이터
        </h2>
        <p className="text-[13px] text-mute">이 기기에만 저장돼요. 다른 기기로 옮길 때 파일로 내보내 가져오세요.</p>
        <BackupActions />
      </section>
    </div>
  )
}

function ThemeSection() {
  const [pref, setPref] = useState(getThemePref)
  const name = useId()
  return (
    <fieldset className="surface flex flex-col gap-3 p-4">
      <legend className="float-left text-sm font-bold">화면 모드</legend>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(([value, label]) => (
          <label
            key={value}
            className="press flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-edge px-2 text-center text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:font-bold has-[:checked]:text-night has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold"
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={pref === value}
              onChange={() => {
                setThemePref(value)
                setPref(value)
              }}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function CategorySection() {
  const categories = useBucketStore((s) => s.customCategories)
  const deleteCategory = useBucketStore((s) => s.deleteCategory)
  return (
    <section aria-labelledby="settings-categories" className="surface flex flex-col gap-3 p-4">
      <h2 id="settings-categories" className="text-sm font-bold">
        내 카테고리
      </h2>
      {categories.length === 0 ? (
        <p className="text-[13px] text-mute">직접 만든 카테고리가 없어요. 꿈을 적을 때 추가할 수 있어요.</p>
      ) : (
        <ul className="flex flex-col">
          {categories.map((c) => (
            <li key={c} className="flex min-h-11 items-center justify-between gap-3 border-b border-line last:border-b-0">
              <span className="min-w-0 break-words">{c}</span>
              <button
                type="button"
                aria-label={`${c} 삭제`}
                className="press min-h-11 shrink-0 px-2 text-sm text-danger"
                // ponytail: 네이티브 확인창(백업 가져오기와 같은 방식)
                onClick={() => window.confirm(`'${c}'을 지울까요? 이 카테고리의 꿈은 미분류가 돼요.`) && deleteCategory(c)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
