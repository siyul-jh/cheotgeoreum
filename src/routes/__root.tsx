import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
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
