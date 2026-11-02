// 무료 요금제 안에서 버티기 위한 상한(개인 사용 규모)
export const MAX_DREAMS = 500 // 계정마다 살아 있는 꿈
// ponytail: 삭제 기록도 1칸씩 차지한다. 추가·삭제를 200번 넘게 반복하면 새 이름이 서버에 안 올라간다. 넘치면 오래된 삭제 기록 정리를 추가
export const MAX_CATEGORY_RECORDS = 200
export const SYNC_CHUNK_BYTES = 1_000_000 // 요청 하나(Vercel 본문 한도 4.5MB 아래)
export const SYNC_CHUNK_COUNT = 1000 // 요청 하나에 담는 꿈·흔적 수
