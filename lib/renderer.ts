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
}

const CORNER_RADIUS = 6

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function render(state: RenderState) {
  const { 
    canvas, images, tiles, panX, panY, zoom, nightMode, 
    tileSize, animOffset, speed = 1, shape = 'spiral', spread = 1 
  } = state
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height

  // Background
  ctx.fillStyle = nightMode ? '#0a0a0a' : '#f5f4f0'
  ctx.fillRect(0, 0, W, H)

  if (images.length === 0) return

  // Time factor for animation
  const t = animOffset * 0.0003 * speed

  // For globe, we need to recalculate positions and re-sort by depth
  let animatedTiles = tiles

  if (shape === 'globe') {
    const radius = spread * 180
    animatedTiles = tiles.map((tile) => {
      const theta = (tile.theta ?? 0) + t  // Rotate around Y axis
      const phi = tile.phi ?? Math.PI / 2

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.cos(phi)
      const z = radius * Math.sin(phi) * Math.sin(theta)
      const depth = z / radius

      // Scale based on depth (back = smaller, front = larger)
      const depthScale = 0.4 + (depth + 1) * 0.4

      return {
        ...tile,
        x,
        y,
        depth,
        size: tile.size * depthScale / (0.5 + (tile.depth! + 1) * 0.35), // Normalize then rescale
      }
    }).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
  } else if (shape === 'cube') {
    // Pre-compute cube positions and sort by depth for proper rendering order
    const cubeScale = spread * 80
    const rotY = t * 0.5
    const rotX = t * 0.3

    animatedTiles = tiles.map((tile) => {
      if (!tile.cubeVertex) return tile
      const vertex = tile.cubeVertex

      // Rotate around Y
      const x1 = vertex.x * Math.cos(rotY) - vertex.z * Math.sin(rotY)
      const z1 = vertex.x * Math.sin(rotY) + vertex.z * Math.cos(rotY)
      const y1 = vertex.y

      // Rotate around X
      const y2 = y1 * Math.cos(rotX) - z1 * Math.sin(rotX)
      const z2 = y1 * Math.sin(rotX) + z1 * Math.cos(rotX)

      const depth = z2

      return {
        ...tile,
        x: x1 * cubeScale,
        y: y2 * cubeScale,
        depth,
      }
    }).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
  }

  ctx.save()
  ctx.translate(W / 2 + panX, H / 2 + panY)
  ctx.scale(zoom, zoom)

  for (let i = 0; i < animatedTiles.length; i++) {
    const tile = animatedTiles[i]
    const img = images[tile.imageIndex % images.length]
    if (!img || !img.complete) continue

    let drawX = tile.x
    let drawY = tile.y
    let drawAngle = tile.angle
    let alpha = 1

    // Shape-specific animation (no image rotation for spiral/orbit)
    if (shape === 'spiral' && tile.baseAngle !== undefined && tile.baseRadius !== undefined) {
      // Spiral: tiles wind outward along the spiral arm
      const animAngle = tile.baseAngle + t * 0.8
      drawX = Math.cos(animAngle) * tile.baseRadius
      drawY = Math.sin(animAngle) * tile.baseRadius
      drawAngle = 0  // No rotation
    } else if (shape === 'orbit' && tile.baseAngle !== undefined && tile.baseRadius !== undefined) {
      // Orbit: tiles rotate around center, outer rings slower
      const ringSpeed = 1 / (1 + (tile.ringIndex ?? 0) * 0.3)
      const animAngle = tile.baseAngle + t * ringSpeed
      drawX = Math.cos(animAngle) * tile.baseRadius
      drawY = Math.sin(animAngle) * tile.baseRadius
      drawAngle = 0  // No rotation
    } else if (shape === 'cube') {
      // Cube: already animated above, apply depth-based alpha
      const depth = tile.depth ?? 0
      alpha = 0.4 + (depth + 1) * 0.3
      drawAngle = 0
    } else if (shape === 'globe') {
      // Globe already animated above, apply depth-based alpha
      const depth = tile.depth ?? 0
      alpha = 0.3 + (depth + 1) * 0.35  // Back tiles more transparent
    }

    const s = tile.size * tileSize
    const hw = s / 2
    const hh = s / 2

    ctx.save()
    ctx.translate(drawX, drawY)
    ctx.rotate(drawAngle)
    ctx.globalAlpha = alpha * (nightMode ? 0.82 : 1)

    // Clip to rounded rect
    ctx.beginPath()
    drawRoundedRect(ctx, -hw, -hh, s, s, CORNER_RADIUS / zoom)
    ctx.clip()

    // Shadow
    ctx.shadowColor = nightMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)'
    ctx.shadowBlur = 12 / zoom
    ctx.shadowOffsetY = 4 / zoom

    // Draw image, cover-fit
    const imgAR = img.naturalWidth / img.naturalHeight
    let imgW = s
    let imgH = s
    let imgX = -hw
    let imgY = -hh

    if (imgAR > 1) {
      imgH = s
      imgW = s * imgAR
      imgX = -imgW / 2
    } else {
      imgW = s
      imgH = s / imgAR
      imgY = -imgH / 2
    }

    ctx.drawImage(img, imgX, imgY, imgW, imgH)

    if (nightMode) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(-hw, -hh, s, s)
    }

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
  spread = 1
): string {
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height

  render({
    canvas: offscreen,
    images,
    tiles,
    panX,
    panY,
    zoom,
    nightMode,
    tileSize,
    animOffset: 0,
    shape,
    spread,
  })

  return offscreen.toDataURL('image/png')
}
