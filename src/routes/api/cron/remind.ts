import { createFileRoute } from '@tanstack/react-router'
import { timingSafeEqual } from 'node:crypto'

// Vercel 크론이 하루 한 번 부른다(CRON_SECRET을 Bearer로 붙여 준다). 키가 없으면 열지 않는다
async function GET({ request }: { request: Request }) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[remind] CRON_SECRET missing')
    return new Response('not configured', { status: 500 })
  }
  const got = Buffer.from(request.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  if (got.length !== want.length || !timingSafeEqual(got, want)) return new Response('unauthorized', { status: 401 })
  const { sendReminders } = await import('@/features/reminder/api/send-reminders.server')
  const result = await sendReminders(new Date())
  console.log('[remind]', result)
  return Response.json(result)
}

export const Route = createFileRoute('/api/cron/remind')({ server: { handlers: { GET } } })
