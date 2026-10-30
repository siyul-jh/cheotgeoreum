import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import stylesUrl from '@/styles.css?url'

declare const __OG_IMAGE__: string

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '첫걸음' },
      { property: 'og:title', content: '첫걸음' },
      { property: 'og:description', content: '버킷리스트를 첫걸음부터' },
      { property: 'og:image', content: __OG_IMAGE__ },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'theme-color', content: '#12151c' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: '첫걸음' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: stylesUrl },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
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
  useEffect(() => {
    // 등록 실패는 오프라인 열기만 못 할 뿐이라 조용히 넘긴다
    if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      {/* 768px 미만은 한 기둥(max-w-md). 넓은 화면 폭은 목록·편집이 쓰고, 작성 화면은 스스로 좁힌다 */}
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6 md:max-w-6xl">
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
        {/* head links로 넣으면 TanStack이 precedence를 붙여 React가 로드까지 렌더를 멈춘다(jsdom 테스트에선 영영). 일반 link로 둔다 */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;500;700&display=swap"
        />
      </head>
      <body className="overflow-x-hidden bg-night font-sans text-ink">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
