export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'cheotgeoreum:theme'
const THEME_COLORS = { light: '#f1f3f6', dark: '#12151c' }

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system' // 저장소를 막은 브라우저는 시스템 설정을 따른다
  }
}

// html[data-theme]에 실제 모드(light|dark)를 단다. CSS는 이 값만 본다(styles.css)
export function applyTheme(pref: ThemePref = getThemePref()) {
  const theme = pref === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : pref
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    // 저장 못 해도 지금 화면에는 적용한다
  }
  applyTheme(pref)
}

// 첫 그리기 전에 head에서 돌려 깜빡임을 막는다. applyTheme과 같은 규칙(번들 전이라 따로 둔다)
export const THEME_BOOT_SCRIPT = `try{var p=localStorage.getItem('${KEY}');var t=p==='light'||p==='dark'?p:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`
