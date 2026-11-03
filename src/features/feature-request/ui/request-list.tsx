import { useQuery } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import { listFeatureRequests, type RequestStatus, type RequestSummary } from '../api/feature-requests'

export const REQUESTS_QUERY_KEY = ['feature-requests']

const STATUS_TEXT: Record<RequestStatus, string> = { open: '검토 중', done: '만들었어요', closed: '하지 않기로 했어요' }
const STATUS_STYLE: Record<RequestStatus, string> = { open: 'border-edge text-mute', done: 'border-gold text-gold', closed: 'border-line text-mute' }

// 모두가 보낸 요청(공개 GitHub 이슈)
export function RequestList({ load = listFeatureRequests }: { load?: () => Promise<RequestSummary[]> }) {
  const { data, isPending, isError, refetch } = useQuery({ queryKey: REQUESTS_QUERY_KEY, queryFn: () => load() })
  if (isPending) return <p className="text-[13px] text-mute">불러오는 중…</p>
  if (isError)
    return (
      <p role="alert" className="flex items-center gap-2 text-[13px] text-danger">
        목록을 불러오지 못했어요.
        <button type="button" className="press min-h-11 px-1 text-ink underline" onClick={() => void refetch()}>
          다시 시도
        </button>
      </p>
    )
  if (data.length === 0) return <p className="text-[13px] text-mute">아직 요청이 없어요. 첫 요청을 남겨 주세요.</p>
  return (
    <ul className="flex flex-col">
      {data.map((r) => (
        <li key={r.number} className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0">
          <div className="flex items-start justify-between gap-2">
            <a href={r.url} target="_blank" rel="noreferrer" className="min-w-0 break-words font-bold underline-offset-2 hover:underline">
              {r.title}
            </a>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[r.status]}`}>{STATUS_TEXT[r.status]}</span>
          </div>
          {r.body && <p className="line-clamp-3 whitespace-pre-line break-words text-[13px] text-mute">{r.body}</p>}
          <p className="text-xs text-mute">
            {DateTime.fromISO(r.createdAt).toFormat('yyyy.MM.dd')}
            {r.comments > 0 && ` · 댓글 ${r.comments}`}
          </p>
        </li>
      ))}
    </ul>
  )
}
