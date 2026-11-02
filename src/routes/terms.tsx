import { Link, createFileRoute } from '@tanstack/react-router'
import { XIcon } from '@/shared/ui/x-icon'

export const Route = createFileRoute('/terms')({ component: TermsPage })

function TermsPage() {
  return (
    <article className="mx-auto flex max-w-md flex-col gap-4 text-sm leading-relaxed [&_h2]:font-bold">
      <header className="flex items-center gap-3">
        <Link to="/settings" aria-label="닫기" className="press flex size-11 shrink-0 items-center justify-center rounded-full bg-card">
          <XIcon className="size-[18px]" />
        </Link>
        <h1 className="font-title text-xl font-bold">이용약관</h1>
      </header>
      <section>
        <h2>1. 서비스</h2>
        <p>첫걸음은 개인이 만든 무료·비상업 버킷리스트 앱입니다. 로그인하지 않아도 쓸 수 있고, 계정 연결은 선택입니다.</p>
      </section>
      <section>
        <h2>2. 변경·중단</h2>
        <p>서비스의 기능은 예고 없이 바뀌거나 중단될 수 있습니다. 중요한 데이터는 설정 &gt; 데이터 내보내기로 백업해 두세요.</p>
      </section>
      <section>
        <h2>3. 금지 행위</h2>
        <ul className="list-disc pl-5">
          <li>다른 사람의 계정이나 정보를 도용하는 행위</li>
          <li>서비스에 과도한 요청을 보내거나 정상적인 운영을 방해하는 행위</li>
          <li>법령을 위반하거나 다른 사람의 권리를 침해하는 내용을 저장·공유하는 행위</li>
        </ul>
      </section>
      <section>
        <h2>4. 면책</h2>
        <p>
          무료로 제공되는 서비스로, 데이터 유실·서비스 중단·AI 제안 내용으로 생긴 손해에 대해 고의 또는 중대한 과실이 없는 한
          책임지지 않습니다.
        </p>
      </section>
      <section>
        <h2>5. 문의</h2>
        <p>
          <a href="https://github.com/siyul-jh/cheotgeoreum/issues" className="underline" target="_blank" rel="noreferrer">
            github.com/siyul-jh/cheotgeoreum/issues
          </a>
        </p>
      </section>
      <p className="text-mute">시행일: 2026년 11월 2일</p>
    </article>
  )
}
