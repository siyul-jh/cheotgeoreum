const KEY = 'cheotgeoreum:welcome-seen'

// 이 기기에서 처음 안내를 봤는지. 저장소를 못 쓰면(사생활 보호 모드 등) 본 것으로 쳐서 매번 뜨지 않게 한다
export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(KEY) !== null
  } catch {
    return true
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // 못 남기면 다음에 한 번 더 보일 뿐이다
  }
}
