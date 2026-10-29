import { type BucketItemInput, formatFieldValue } from '@/entities/bucket-item'
import { STAR_PATH } from '@/shared/ui/star-icon'
import { wrapLines } from './card-text'

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1920

// 밤하늘 토큰(styles.css @theme)과 같은 값
const NIGHT = '#12151C'
const GOLD = '#F2C14E'
const INK = '#EDEAE3'
const MUTE = '#A9AEB8'
const EDGE = '#3A4150'
const TITLE_FONT = '"Gowun Dodum", sans-serif'
const BODY_FONT = '"Noto Sans KR", sans-serif'
const CX = CARD_WIDTH / 2

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(size / 18, size / 18)
  ctx.fillStyle = color
  ctx.fill(new Path2D(STAR_PATH))
  ctx.restore()
}

// 카드마다 같은 별자리가 나오도록 고정 시드 난수
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

function drawSky(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = NIGHT
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  const glow = ctx.createRadialGradient(CX, 560, 0, CX, 560, 560)
  glow.addColorStop(0, 'rgb(242 193 78 / 0.18)')
  glow.addColorStop(1, 'rgb(242 193 78 / 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const rand = seeded(20261029)
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.2 + rand() * 0.6
    ctx.fillStyle = rand() < 0.2 ? GOLD : INK
    ctx.beginPath()
    ctx.arc(rand() * CARD_WIDTH, rand() * CARD_HEIGHT, 1.5 + rand() * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 8; i++) {
    ctx.globalAlpha = 0.35 + rand() * 0.4
    drawStar(ctx, rand() * CARD_WIDTH, rand() * CARD_HEIGHT, 24 + rand() * 20, GOLD)
  }
  ctx.globalAlpha = 1
}

export function drawCard(ctx: CanvasRenderingContext2D, item: BucketItemInput) {
  drawSky(ctx)
  drawStar(ctx, CX, 560, 260, GOLD)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const measure = (s: string) => ctx.measureText(s).width
  let y = 820

  ctx.font = `84px ${TITLE_FONT}`
  ctx.fillStyle = INK
  for (const line of wrapLines(item.title, 880, 3, measure)) {
    ctx.fillText(line, CX, y)
    y += 118
  }

  if (item.targetPeriod) {
    y += 40
    ctx.font = `500 42px ${BODY_FONT}`
    ctx.fillStyle = GOLD
    ctx.fillText(`${formatFieldValue('targetPeriod', item)}까지`, CX, y)
    y += 60
  }

  if (item.why) {
    y += 40
    ctx.font = `40px ${BODY_FONT}`
    ctx.fillStyle = MUTE
    for (const line of wrapLines(item.why, 840, 3, measure)) {
      ctx.fillText(line, CX, y)
      y += 64
    }
  }

  if (item.category) {
    y += 48
    ctx.font = `500 34px ${BODY_FONT}`
    const width = measure(item.category) + 64
    ctx.strokeStyle = EDGE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(CX - width / 2, y, width, 72, 36)
    ctx.stroke()
    ctx.fillStyle = MUTE
    ctx.fillText(item.category, CX, y + 17)
  }

  // 하단 로고: 작은 별 + '첫걸음'을 한 덩어리로 가운데 정렬
  ctx.font = `52px ${TITLE_FONT}`
  const logoWidth = measure('첫걸음')
  const left = CX - (logoWidth + 56) / 2
  drawStar(ctx, left + 20, 1766, 40, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.fillText('첫걸음', left + 56, 1736)
}

// 구글 폰트는 쓰기 전엔 안 받아지고, 한글은 글자 범위별로 나뉘어 있어 카드에 쓸 글자로 명시 로드한다.
// 못 받으면 font 목록의 sans-serif로 그린다
async function loadFonts(text: string) {
  try {
    await Promise.all([
      document.fonts.load(`84px ${TITLE_FONT}`, text),
      document.fonts.load(`40px ${BODY_FONT}`, text),
      document.fonts.load(`500 40px ${BODY_FONT}`, text),
    ])
    await document.fonts.ready
  } catch {
    // sans-serif로 진행
  }
}

export async function createCardPng(item: BucketItemInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d를 쓸 수 없어요')
  const period = item.targetPeriod ? formatFieldValue('targetPeriod', item) : ''
  await loadFonts(`${item.title}${item.why}${item.category ?? ''}${period}까지 첫걸음`)
  drawCard(ctx, item)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG를 만들지 못했어요'))), 'image/png'),
  )
}
