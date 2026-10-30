import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { applyTheme, THEME_BOOT_SCRIPT } from '@/shared/lib/theme'
import { FLOATING_STACK_ID } from '@/shared/ui/floating-status'
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
  useEffect(() => {
    // 다시 적용할 때: 폰 모드가 바뀜('시스템 설정'일 때만 달라진다), 다른 탭에서 바꿈(storage),
    // 뒤로가기 캐시(bfcache)로 돌아옴(pageshow) — 그 사이 바뀐 설정이 화면에 남지 않게
    applyTheme()
    const media = matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyTheme()
    media.addEventListener('change', onChange)
    addEventListener('storage', onChange)
    addEventListener('pageshow', onChange)
    return () => {
      media.removeEventListener('change', onChange)
      removeEventListener('storage', onChange)
      removeEventListener('pageshow', onChange)
    }
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      {/* 768px 미만은 한 기둥(max-w-md). 넓은 화면 폭은 목록·편집이 쓰고, 작성 화면은 스스로 좁힌다 */}
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6 md:max-w-6xl">
        <Outlet />
      </main>
      <div
        id={FLOATING_STACK_ID}
        className="pointer-events-none fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-md flex-col gap-2 [body:has([data-save-bar])_&]:bottom-28"
      />
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // 첫 그리기 전 스크립트가 data-theme을 단다: React가 다른 값이라 경고하지 않게
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
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
