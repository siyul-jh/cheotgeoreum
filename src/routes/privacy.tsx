import { Link, createFileRoute } from '@tanstack/react-router'
import { XIcon } from '@/shared/ui/x-icon'

export const Route = createFileRoute('/privacy')({ component: PrivacyPage })

function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-md flex-col gap-4 text-sm leading-relaxed [&_h2]:font-bold">
      <header className="flex items-center gap-3">
        <Link to="/settings" aria-label="닫기" className="press flex size-11 shrink-0 items-center justify-center rounded-full bg-card">
          <XIcon className="size-[18px]" />
        </Link>
        <h1 className="font-title text-xl font-bold">개인정보처리방침</h1>
      </header>
      <p>로그인하지 않으면 모든 데이터는 이 기기에만 저장되고, 아래 정보를 서버에 모으지 않습니다.</p>
      <section>
        <h2>1. 수집 항목</h2>
        <ul className="list-disc pl-5">
          <li>카카오로 연결: 카카오 회원번호, 닉네임</li>
          <li>구글로 연결: 이메일, 이름, 프로필 사진</li>
          <li>로그인 기록: 접속 IP 주소, 브라우저 정보(User-Agent)</li>
          <li>로그인 연동 토큰(카카오·구글이 발급한 접근 토큰)</li>
          <li>연결 후 저장한 꿈·내 카테고리와 지운 꿈의 기록(다른 기기에도 지우기 위해)</li>
          <li>짧은 링크 만들기·기능 요청: 남용을 막기 위한 접속 IP 주소(1시간 뒤 자동 삭제)</li>
          <li>기능 요청: 직접 적은 제목·내용(공개 GitHub 이슈로 게시되어 누구나 볼 수 있음)</li>
        </ul>
      </section>
      <section>
        <h2>2. 목적</h2>
        <p>로그인, 여러 기기 간 데이터 동기화, 남용 방지, 요청받은 기능의 개발에만 씁니다. 광고나 판매에 쓰지 않습니다.</p>
      </section>
      <section>
        <h2>3. 보유 기간</h2>
        <p>계정을 삭제(탈퇴)하면 즉시 파기합니다. 기능 요청은 계정과 연결되지 않아 함께 지워지지 않으니, 지우려면 아래 연락처로 알려 주세요.</p>
      </section>
      <section>
        <h2>4. 처리 위탁·국외 이전</h2>
        <p>아래 해외 서비스에 저장·처리를 맡깁니다. 서비스 운영에 필요한 동안만 보관됩니다.</p>
        <ul className="list-disc pl-5">
          <li>Vercel Inc.(미국): 앱 호스팅·서버 실행</li>
          <li>Neon(미국): 계정·꿈 데이터베이스</li>
          <li>Upstash(미국): 공유한 카드·목록의 짧은 링크 저장, 남용 방지용 접속 IP 임시 저장</li>
          <li>GitHub Inc.(미국): 기능 요청 게시(공개 이슈)</li>
          <li>NVIDIA(미국): AI 기능을 쓸 때 입력한 꿈 내용을 AI 응답 생성에 사용(NVIDIA NIM)</li>
        </ul>
      </section>
      <section>
        <h2>5. 권리 행사</h2>
        <p>
          설정 &gt; 데이터 내보내기로 내 데이터를 파일로 받을 수 있습니다. 설정 &gt; 계정 &gt; 계정 삭제로 계정과 서버의 데이터를
          즉시 지울 수 있고, 카카오로 연결했다면 카카오 연결도 함께 끊습니다. 이 기기 안에 저장된 꿈은 지워지지 않습니다.
        </p>
      </section>
      <section>
        <h2>6. 안전 조치</h2>
        <p>모든 통신은 HTTPS로 암호화하고, 로그인 세션은 httpOnly 쿠키로 관리하며, 서버는 본인 계정의 데이터만 조회합니다.</p>
      </section>
      <section>
        <h2>7. 연락처</h2>
        <p>
          <a href="https://github.com/siyul-jh/cheotgeoreum/issues" className="underline" target="_blank" rel="noreferrer">
            github.com/siyul-jh/cheotgeoreum/issues
          </a>
        </p>
      </section>
      <p className="text-mute">시행일: 2026년 11월 3일</p>
    </article>
  )
}
