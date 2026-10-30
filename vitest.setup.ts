// jsdom에는 matchMedia가 없다: 테마(prefers-color-scheme) 코드가 돌 수 있게 '다크 시스템'으로 둔다
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
}
