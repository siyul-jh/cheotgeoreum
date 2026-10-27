import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { useState } from 'react'
import stylesUrl from '@/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '첫걸음' },
    ],
    links: [{ rel: 'stylesheet', href: stylesUrl }],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  // 저장 데이터가 깨진 항목 등 예상 못한 오류에서 기본 오류 화면 대신 목록으로 돌아갈 길을 준다
  errorComponent: () => (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
      <p>이 화면을 열지 못했어요.</p>
      <Link to="/" className="underline">
        목록으로
      </Link>
    </main>
  ),
})

function RootLayout() {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
        <Outlet />
      </main>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body className="overflow-x-hidden bg-zinc-50 text-zinc-900">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
