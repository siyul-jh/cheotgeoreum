import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const PushSubscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
})
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>

// 서버 전용 모듈은 handler 안에서만 동적 import한다
export const savePushSubscription = createServerFn({ method: 'POST' })
  .validator(PushSubscriptionSchema)
  .handler(async ({ data }) => {
    const [{ requireUserId }, { savePush }] = await Promise.all([import('@/shared/api/auth.server'), import('./push-subscription.server')])
    return savePush(await requireUserId(), data)
  })

export const deletePushSubscription = createServerFn({ method: 'POST' })
  .validator(z.object({ endpoint: z.string().max(1000) }))
  .handler(async ({ data }) => {
    const [{ requireUserId }, { deletePush }] = await Promise.all([import('@/shared/api/auth.server'), import('./push-subscription.server')])
    await deletePush(await requireUserId(), data.endpoint)
  })

export const sendTestPush = createServerFn({ method: 'POST' })
  .validator(z.object({ endpoint: z.string().max(1000) }))
  .handler(async ({ data }) => {
    const [{ requireUserId }, { sendTestReminder }] = await Promise.all([import('@/shared/api/auth.server'), import('./send-reminders.server')])
    return sendTestReminder(await requireUserId(), data.endpoint)
  })
