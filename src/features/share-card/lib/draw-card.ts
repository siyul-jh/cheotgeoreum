import { type BucketItemInput, formatFieldValue } from '@/entities/bucket-item'
import { STAR_PATH } from '@/shared/ui/star-icon'
import { wrapLines } from './card-text'

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1920

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

// textTop 아래 가운데 기둥은 글자 자리라 별을 뿌리지 않는다
function drawSky(ctx: CanvasRenderingContext2D, glowY: number, textTop: number) {
  ctx.fillStyle = NIGHT
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  const glow = ctx.createRadialGradient(CX, glowY, 0, CX, glowY, 560)
  glow.addColorStop(0, 'rgb(242 193 78 / 0.18)')
  glow.addColorStop(1, 'rgb(242 193 78 / 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const rand = seeded(20261029)
  const inTextArea = (x: number, y: number) => y > textTop && x > 80 && x < CARD_WIDTH - 80
  for (let i = 0; i < 90; i++) {
    const [x, y, r, alpha, gold] = [rand() * CARD_WIDTH, rand() * CARD_HEIGHT, 1.5 + rand() * 2.5, 0.2 + rand() * 0.6, rand() < 0.2]
    if (inTextArea(x, y)) continue
    ctx.globalAlpha = alpha
    ctx.fillStyle = gold ? GOLD : INK
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 8; i++) {
    const [x, y, size, alpha] = [rand() * CARD_WIDTH, rand() * CARD_HEIGHT, 24 + rand() * 20, 0.35 + rand() * 0.4]
    if (inTextArea(x, y)) continue
    ctx.globalAlpha = alpha
    drawStar(ctx, x, y, size, GOLD)
  }
  ctx.globalAlpha = 1
}

// 위에서부터 쌓는 한 덩어리. gap은 앞 덩어리와의 간격
type Block = { gap: number; height: number; draw: (top: number) => void }

const STAR_SIZE = 200
const LOGO_TOP = 1736
const CONTENT_BOTTOM = 1640 // 로고 위 여백

export function drawCard(ctx: CanvasRenderingContext2D, item: BucketItemInput) {
  const measure = (s: string) => ctx.measureText(s).width
  const text = (s: string, x: number, y: number, font: string, color: string) => {
    ctx.font = font
    ctx.fillStyle = color
    ctx.fillText(s, x, y)
  }
  const filled = {
    prerequisites: item.prerequisites.length > 0,
    nextAction: item.nextAction.text !== '' || item.nextAction.dueDate !== null,
    companions: item.companions.length > 0,
  }
  const details = (['prerequisites', 'nextAction', 'companions'] as const).filter((f) => filled[f])
  const blocks: Block[] = []

  ctx.font = `84px ${TITLE_FONT}`
  const titleLines = wrapLines(item.title, 880, 3, measure)
  blocks.push({
    gap: 60,
    height: titleLines.length * 118,
    draw: (top) => titleLines.forEach((line, i) => text(line, CX, top + i * 118, `84px ${TITLE_FONT}`, INK)),
  })

  if (item.targetPeriod) {
    const period = formatFieldValue('targetPeriod', item)
    blocks.push({ gap: 28, height: 60, draw: (top) => text(period, CX, top, `500 42px ${BODY_FONT}`, GOLD) })
  }

  // 카테고리·상태 칩 한 줄
  const chips = [item.category, item.status].filter((c) => c !== null)
  ctx.font = `500 34px ${BODY_FONT}`
  const chipWidths = chips.map((c) => measure(c) + 64)
  const chipsWidth = chipWidths.reduce((a, b) => a + b, 0) + (chips.length - 1) * 16
  blocks.push({
    gap: 40,
    height: 72,
    draw: (top) => {
      let x = CX - chipsWidth / 2
      chips.forEach((chip, i) => {
        ctx.strokeStyle = EDGE
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(x, top, chipWidths[i], 72, 36)
        ctx.stroke()
        text(chip, x + chipWidths[i] / 2, top + 17, `500 34px ${BODY_FONT}`, MUTE)
        x += chipWidths[i] + 16
      })
    },
  })

  if (item.why) {
    ctx.font = `40px ${BODY_FONT}`
    // 아래 칸이 있으면 2줄로 줄여 한 화면에 담는다
    const whyLines = wrapLines(item.why, 840, details.length > 0 ? 2 : 3, measure)
    blocks.push({
      gap: 40,
      height: whyLines.length * 64,
      draw: (top) => whyLines.forEach((line, i) => text(line, CX, top + i * 64, `40px ${BODY_FONT}`, MUTE)),
    })
  }

  // 선행 과제·다음 행동·함께할 사람: 이름 + 값 한 줄(넘치면 …)
  ctx.font = `38px ${BODY_FONT}`
  for (const field of details) {
    const [value] = wrapLines(formatFieldValue(field, item), 840, 1, measure)
    blocks.push({
      gap: field === details[0] ? 64 : 32,
      height: 100,
      draw: (top) => {
        text(DETAIL_LABELS[field], CX, top, `30px ${BODY_FONT}`, MUTE)
        text(value, CX, top + 44, `38px ${BODY_FONT}`, INK)
      },
    })
  }

  // 별 + 내용 전체를 로고 위 공간의 세로 가운데에 둔다
  const contentHeight = STAR_SIZE + blocks.reduce((sum, b) => sum + b.gap + b.height, 0)
  const top = Math.max(120, (CONTENT_BOTTOM - contentHeight) / 2)
  const starY = top + STAR_SIZE / 2
  drawSky(ctx, starY, top + STAR_SIZE + 20)
  drawStar(ctx, CX, starY, STAR_SIZE, GOLD)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  let y = top + STAR_SIZE
  for (const block of blocks) {
    y += block.gap
    block.draw(y)
    y += block.height
  }

  // 하단 로고: 작은 별 + '첫걸음'을 한 덩어리로 가운데 정렬
  ctx.font = `52px ${TITLE_FONT}`
  const logoWidth = measure('첫걸음')
  const left = CX - (logoWidth + 56) / 2
  drawStar(ctx, left + 20, LOGO_TOP + 30, 40, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.fillText('첫걸음', left + 56, LOGO_TOP)
}

const DETAIL_LABELS = { prerequisites: '선행 과제', nextAction: '다음 행동', companions: '함께할 사람' } as const

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
  const fields = ['targetPeriod', 'prerequisites', 'nextAction', 'companions'] as const
  await loadFonts(`${item.title}${item.why}${item.category ?? ''}${item.status}${fields.map((f) => formatFieldValue(f, item)).join('')} 첫걸음 선행 과제 다음 행동 함께할 사람`)
  drawCard(ctx, item)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG를 만들지 못했어요'))), 'image/png'),
  )
}
