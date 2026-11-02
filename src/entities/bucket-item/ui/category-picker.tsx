import { useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { XIcon } from '@/shared/ui/x-icon'
import { DEFAULT_CATEGORIES } from '../model/schema'
import { selectCategories, useBucketStore } from '../model/store'
import { CategoryNameForm } from './category-name-form'

type Props = { value: string | null; onChange: (v: string | null) => void }

const isDefault = (name: string) => DEFAULT_CATEGORIES.some((c) => c === name)
// 이만큼(ms) 누르고 있으면 편집(지우기) 모드
export const LONG_PRESS_MS = 500

export function CategoryPicker({ value, onChange }: Props) {
  const categories = useBucketStore(useShallow(selectCategories))
  const addCategory = useBucketStore((s) => s.addCategory)
  const deleteCategory = useBucketStore((s) => s.deleteCategory)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  // 꾹 누르기 타이머와, 꾹 누른 뒤 따라오는 click을 선택으로 치지 않기 위한 표시
  const press = useRef({ timer: 0, fired: false })
  const hasCustom = categories.some((c) => !isDefault(c))

  const startEditing = () => {
    press.current.fired = true
    setEditing(true)
    navigator.vibrate?.(10)
  }
  const cancelPress = () => clearTimeout(press.current.timer)

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2" aria-label="카테고리">
        {categories.map((name, i) => {
          const custom = !isDefault(name)
          return (
            <li
              key={name}
              className={`flex items-center gap-1 ${editing && custom ? 'wiggle' : ''}`}
              style={{ animationDelay: `${(i % 3) * -0.08}s` }}
            >
              <button
                type="button"
                aria-pressed={value === name}
                // 꾹 누를 때 iOS 텍스트 선택·말풍선이 뜨지 않게
                className={`btn select-none [-webkit-touch-callout:none] ${value === name ? 'btn-primary' : ''}`}
                onPointerDown={() => {
                  if (!custom) return
                  press.current.fired = false
                  press.current.timer = window.setTimeout(startEditing, LONG_PRESS_MS)
                }}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
                // 키보드(메뉴 키)·마우스 오른쪽 클릭·안드로이드 꾹 누르기
                onContextMenu={(e) => {
                  if (!custom) return
                  e.preventDefault()
                  cancelPress()
                  startEditing()
                }}
                onClick={() => {
                  if (press.current.fired) {
                    press.current.fired = false
                    return
                  }
                  onChange(value === name ? null : name)
                }}
              >
                {name}
              </button>
              {editing &&
                custom &&
                (confirming === name ? (
                  <span className="flex items-center gap-1 text-sm" role="group" aria-label={`${name} 삭제 확인`}>
                    항목은 미분류로 바뀌어요.
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        deleteCategory(name)
                        if (value === name) onChange(null)
                        setConfirming(null)
                        if (categories.filter((c) => !isDefault(c)).length === 1) setEditing(false)
                      }}
                    >
                      삭제
                    </button>
                    <button type="button" className="btn" onClick={() => setConfirming(null)}>
                      취소
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="pop press flex size-11 items-center justify-center rounded-full text-mute"
                    aria-label={`${name} 삭제`}
                    onClick={() => setConfirming(name)}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                ))}
            </li>
          )
        })}
      </ul>
      {hasCustom &&
        (editing ? (
          <button
            type="button"
            className="btn self-start font-bold"
            onClick={() => {
              setEditing(false)
              setConfirming(null)
            }}
          >
            완료
          </button>
        ) : (
          <p className="text-[13px] text-mute">내가 만든 카테고리는 꾹 눌러 지울 수 있어요.</p>
        ))}
      <CategoryNameForm
        label="새 카테고리 이름"
        placeholder="새 카테고리 (예: 독서)"
        submitLabel="추가"
        onSubmit={(name) => {
          if (!addCategory(name)) return false
          onChange(name)
          return true
        }}
      />
    </div>
  )
}
