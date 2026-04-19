import type { Tile, ShapeType } from './layouts'

export interface RenderState {
  canvas: HTMLCanvasElement
  images: HTMLImageElement[]
  tiles: Tile[]
  panX: number
  panY: number
  zoom: number
  nightMode: boolean
  tileSize: number
  animOffset: number
  speed?: number
  shape?: ShapeType
  spread?: number
  radius?: number
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const clampedR = Math.min(r, Math.min(w, h) / 2)
  ctx.beginPath()
  ctx.moveTo(x + clampedR, y)
  ctx.lineTo(x + w - clampedR, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + clampedR)
  ctx.lineTo(x + w, y + h - clampedR)
  ctx.quadraticCurveTo(x + w, y + h, x + w - clampedR, y + h)
  ctx.lineTo(x + clampedR, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - clampedR)
  ctx.lineTo(x, y + clampedR)
  ctx.quadraticCurveTo(x, y, x + clampedR, y)
  ctx.closePath()
}

export function render(state: RenderState) {
  const {
    canvas, images, tiles, panX, panY, zoom, nightMode,
    tileSize, animOffset, speed = 1, shape = 'spiral', spread = 1,
    radius = 6,
  } = state
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height

  ctx.fillStyle = nightMode ? '#0a0a0a' : '#f5f4f0'
  ctx.fillRect(0, 0, W, H)

  if (images.length === 0) return

  const t = animOffset * 0.0003 * speed
  let animatedTiles = tiles

  if (shape === 'globe') {
    const r = spread * 180
    animatedTiles = tiles.map((tile) => {
      const theta = (tile.theta ?? 0) + t
      const phi = tile.phi ?? Math.PI / 2
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.cos(phi)
      const z = r * Math.sin(phi) * Math.sin(theta)
      const depth = z / r
      const depthScale = 0.4 + (depth + 1) * 0.4
      return {
        ...tile,
        x, y, depth,
        size: tile.size * depthScale / (0.5 + (tile.depth! + 1) * 0.35),
      }
    }).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
  } else if (shape === 'cube') {
    const cubeScale = spread * 80
    const rotY = t * 0.5
    const rotX = t * 0.3
    animatedTiles = tiles.map((tile) => {
      if (!tile.cubeVertex) return tile
      const v = tile.cubeVertex
      const x1 = v.x * Math.cos(rotY) - v.z * Math.sin(rotY)
      const z1 = v.x * Math.sin(rotY) + v.z * Math.cos(rotY)
      const y2 = v.y * Math.cos(rotX) - z1 * Math.sin(rotX)
      const z2 = v.y * Math.sin(rotX) + z1 * Math.cos(rotX)
      return { ...tile, x: x1 * cubeScale, y: y2 * cubeScale, depth: z2 }
    }).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
  }

  ctx.save()
  ctx.translate(W / 2 + panX, H / 2 + panY)
  ctx.scale(zoom, zoom)

  for (let i = 0; i < animatedTiles.length; i++) {
    const tile = animatedTiles[i]
    // Images repeat: cycle through available images
    const img = images[tile.imageIndex % images.length]
    if (!img || !img.complete) continue

    let drawX = tile.x
    let drawY = tile.y
    let drawAngle = tile.angle
    let alpha = 1

    if (shape === 'spiral' && tile.baseAngle !== undefined && tile.baseRadius !== undefined) {
      const animAngle = tile.baseAngle + t * 0.8
      drawX = Math.cos(animAngle) * tile.baseRadius
      drawY = Math.sin(animAngle) * tile.baseRadius
      drawAngle = 0
    } else if (shape === 'orbit' && tile.baseAngle !== undefined && tile.baseRadius !== undefined) {
      const ringSpeed = 1 / (1 + (tile.ringIndex ?? 0) * 0.3)
      const animAngle = tile.baseAngle + t * ringSpeed
      drawX = Math.cos(animAngle) * tile.baseRadius
      drawY = Math.sin(animAngle) * tile.baseRadius
      drawAngle = 0
    } else if (shape === 'cube') {
      const depth = tile.depth ?? 0
      alpha = 0.4 + (depth + 1) * 0.3
      drawAngle = 0
    } else if (shape === 'globe') {
      const depth = tile.depth ?? 0
      alpha = 0.3 + (depth + 1) * 0.35
    }

    const s = tile.size * tileSize
    const hw = s / 2
    const hh = s / 2

    // Scale corner radius relative to tile size, capped at radius param (px, unscaled)
    const cornerR = Math.min(radius / zoom, hw, hh)

    ctx.save()
    ctx.translate(drawX, drawY)
    ctx.rotate(drawAngle)
    ctx.globalAlpha = alpha

    ctx.beginPath()
    drawRoundedRect(ctx, -hw, -hh, s, s, cornerR)
    ctx.clip()

    ctx.shadowColor = nightMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)'
    ctx.shadowBlur = 12 / zoom
    ctx.shadowOffsetY = 4 / zoom

    const imgAR = img.naturalWidth / img.naturalHeight
    let imgW = s, imgH = s, imgX = -hw, imgY = -hh
    if (imgAR > 1) {
      imgH = s; imgW = s * imgAR; imgX = -imgW / 2
    } else {
      imgW = s; imgH = s / imgAR; imgY = -imgH / 2
    }

    ctx.drawImage(img, imgX, imgY, imgW, imgH)

    // NO dark overlay in night mode — removed intentionally

    ctx.globalAlpha = 1
    ctx.restore()
  }

  ctx.restore()
}

export function exportCanvas(
  images: HTMLImageElement[],
  tiles: Tile[],
  panX: number,
  panY: number,
  zoom: number,
  nightMode: boolean,
  tileSize: number,
  width = 2400,
  height = 1600,
  shape: ShapeType = 'spiral',
  spread = 1,
  radius = 6,
): string {
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  render({
    canvas: offscreen,
    images, tiles, panX, panY, zoom, nightMode,
    tileSize, animOffset: 0, shape, spread, radius,
  })
  return offscreen.toDataURL('image/png')
}
