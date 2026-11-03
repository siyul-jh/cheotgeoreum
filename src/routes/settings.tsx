import { Link, createFileRoute } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { CategoryNameForm, useBucketStore } from '@/entities/bucket-item'
import { AccountSection } from '@/features/auth'
import { SyncPanel, requestSync, sendChunk } from '@/features/dream-sync'
import { BackupActions } from '@/features/backup'
import { ReminderToggle, turnOffReminder } from '@/features/reminder'
import { authClient } from '@/shared/api/auth-client'
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
      <AccountSection
        renderLinked={(userId, signOut) => <SyncPanel userId={userId} onSignOut={signOut} />}
        // 이 기기 꿈의 주인일 때만 올려 본다(다른 계정 꿈을 올리지 않는다)
        beforeSignOut={(userId) => (useBucketStore.getState().ownerId === userId ? requestSync(sendChunk) : Promise.resolve(true))}
        // 계정이 지워져도 이 기기의 꿈은 남기고, 어느 계정 것도 아니게 한다
        // 다른 사람이 이 기기로 로그인해도 앞사람의 알림이 오지 않게
        onSignOut={turnOffReminder}
        onAccountDeleted={() => useBucketStore.setState({ ownerId: null })}
      />
      <ReminderSection />
      <ThemeSection />
      <CategorySection />
      <section aria-labelledby="settings-data" className="surface flex flex-col gap-1 p-4">
        <h2 id="settings-data" className="text-sm font-bold">
          데이터
        </h2>
        <p className="text-[13px] text-mute">로그인하지 않으면 이 기기에만 저장돼요. 파일로 내보내 백업할 수 있어요.</p>
        <BackupActions />
      </section>
      <Link to="/welcome" className="surface press flex min-h-11 items-center justify-between p-4 text-sm font-bold">
        처음 안내 다시 보기
        <span aria-hidden="true" className="text-mute">
          ›
        </span>
      </Link>
      <Link to="/feature-request" className="surface press flex min-h-11 items-center justify-between p-4 text-sm font-bold">
        기능 요청하기
        <span aria-hidden="true" className="text-mute">
          ›
        </span>
      </Link>
    </div>
  )
}

// 구독을 계정에 묶어 서버가 보내므로 계정을 연결해야 켤 수 있다
function ReminderSection() {
  const { data, isPending } = authClient.useSession()
  return (
    <section aria-labelledby="settings-reminder" className="surface flex flex-col gap-2 p-4">
      <h2 id="settings-reminder" className="text-sm font-bold">
        알림
      </h2>
      {isPending ? null : data ? <ReminderToggle /> : <p className="text-[13px] text-mute">계정을 연결하면 목표 시기 알림을 켤 수 있어요.</p>}
    </section>
  )
}

function ThemeSection() {
  const [pref, setPref] = useState(getThemePref)
  const name = useId()
  return (
    // legend는 iOS Safari가 카드 테두리 위에 걸쳐 그려 다른 카드처럼 제목+radiogroup으로 둔다
    <section className="surface flex flex-col gap-3 p-4">
      <h2 id={`${name}-title`} className="text-sm font-bold">
        화면 모드
      </h2>
      {/* 폭이 모자라면 줄을 바꿔 카드 밖으로 넘치지 않게 */}
      <div role="radiogroup" aria-labelledby={`${name}-title`} className="flex flex-wrap gap-2">
        {THEMES.map(([value, label]) => (
          <label
            key={value}
            className="press flex min-h-11 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-full border border-edge px-3 text-center text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:font-bold has-[:checked]:text-night has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold"
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
    </section>
  )
}

function CategorySection() {
  const categories = useBucketStore((s) => s.customCategories)
  const addCategory = useBucketStore((s) => s.addCategory)
  const renameCategory = useBucketStore((s) => s.renameCategory)
  const deleteCategory = useBucketStore((s) => s.deleteCategory)
  const [renaming, setRenaming] = useState<string | null>(null)
  return (
    <section aria-labelledby="settings-categories" className="surface flex flex-col gap-3 p-4">
      <h2 id="settings-categories" className="text-sm font-bold">
        내 카테고리
      </h2>
      {categories.length === 0 ? (
        <p className="text-[13px] text-mute">직접 만든 카테고리가 없어요.</p>
      ) : (
        <ul className="flex flex-col">
          {categories.map((c) => (
            <li key={c} className="flex min-h-11 items-center justify-between gap-3 border-b border-line py-1 last:border-b-0">
              {renaming === c ? (
                <div className="min-w-0 flex-1">
                  <CategoryNameForm
                    label={`${c} 새 이름`}
                    submitLabel="저장"
                    initial={c}
                    onSubmit={(name) => {
                      if (!renameCategory(c, name)) return false
                      setRenaming(null)
                      return true
                    }}
                    onCancel={() => setRenaming(null)}
                  />
                </div>
              ) : (
                <>
                  <span className="min-w-0 break-words">{c}</span>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      aria-label={`${c} 이름 바꾸기`}
                      className="press min-h-11 px-2 text-sm text-mute"
                      onClick={() => setRenaming(c)}
                    >
                      이름 바꾸기
                    </button>
                    <button
                      type="button"
                      aria-label={`${c} 삭제`}
                      className="press min-h-11 px-2 text-sm text-danger"
                      // ponytail: 네이티브 확인창(백업 가져오기와 같은 방식)
                      onClick={() => window.confirm(`'${c}'을 지울까요? 이 카테고리의 꿈은 미분류가 돼요.`) && deleteCategory(c)}
                    >
                      삭제
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <CategoryNameForm label="새 카테고리 이름" placeholder="새 카테고리 (예: 독서)" submitLabel="추가" onSubmit={addCategory} />
    </section>
  )
}
