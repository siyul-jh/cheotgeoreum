import { useActionState, useState } from 'react'
import { REQUEST_LIMITS, sendFeatureRequest, type SendResult } from '../api/send-request'

const ERROR_TEXT = {
  rate: '요청을 너무 자주 보냈어요. 한 시간 뒤에 다시 보내 주세요.',
  error: '보내지 못했어요. 잠시 뒤 다시 시도해 주세요.',
} as const

// 보낸 요청은 공개 GitHub 이슈가 된다(개발 목록으로 그대로 이어 쓴다)
export function FeatureRequestForm({ submit = sendFeatureRequest }: { submit?: typeof sendFeatureRequest }) {
  // 제어 입력: 폼 action이 끝나면 React가 비제어 입력을 비우는데, 실패했을 때 쓴 글이 사라지면 안 된다
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [state, action, pending] = useActionState(
    (): Promise<SendResult> => submit({ data: { title, body } }).catch(() => ({ ok: false, code: 'error' }) as const),
    null,
  )
  if (state?.ok)
    return (
      <div role="status" className="flex flex-col gap-2 text-sm">
        <p>요청을 보냈어요. 고마워요!</p>
        <a href={state.url} target="_blank" rel="noreferrer" className="underline">
          보낸 요청 보기(GitHub)
        </a>
      </div>
    )
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-bold">
        어떤 기능이 있으면 좋을까요?
        <input
          required
          className="field font-normal"
          maxLength={REQUEST_LIMITS.title}
          placeholder="예: 매일 아침 알림"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        자세히 알려 주세요
        <textarea
          required
          rows={6}
          className="field font-normal"
          maxLength={REQUEST_LIMITS.body}
          placeholder="언제, 왜 필요한지 적어 주면 만들 때 도움이 돼요"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <p className="text-[13px] text-mute">
        보낸 내용은 누구나 볼 수 있는 GitHub 이슈로 올라가요. 이름·연락처 같은 개인정보는 적지 말아 주세요.
      </p>
      {state && !state.ok && (
        <p role="alert" className="text-[13px] text-danger">
          {ERROR_TEXT[state.code]}
        </p>
      )}
      <button type="submit" className="btn btn-primary press" disabled={pending}>
        {pending ? '보내는 중…' : '요청 보내기'}
      </button>
    </form>
  )
}
