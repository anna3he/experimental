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
  x: number, y: number, w: number, h: number, r: number
) {
  const cr = Math.min(r, Math.min(w, h) / 2)
  ctx.beginPath()
  ctx.moveTo(x + cr, y)
  ctx.lineTo(x + w - cr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + cr)
  ctx.lineTo(x + w, y + h - cr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - cr, y + h)
  ctx.lineTo(x + cr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - cr)
  ctx.lineTo(x, y + cr)
  ctx.quadraticCurveTo(x, y, x + cr, y)
  ctx.closePath()
}

// Draw a single image cover-fitted into a quad defined by 4 corner points
// Used for cube faces to fill the entire face
function drawImageOnFace(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  p0: {x:number,y:number},
  p1: {x:number,y:number},
  p2: {x:number,y:number},
  p3: {x:number,y:number},
  cornerR: number
) {
  ctx.save()
  // Clip to the face quad
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.lineTo(p3.x, p3.y)
  ctx.closePath()
  ctx.clip()

  // Bounding box of the quad
  const minX = Math.min(p0.x, p1.x, p2.x, p3.x)
  const minY = Math.min(p0.y, p1.y, p2.y, p3.y)
  const maxX = Math.max(p0.x, p1.x, p2.x, p3.x)
  const maxY = Math.max(p0.y, p1.y, p2.y, p3.y)
  const w = maxX - minX
  const h = maxY - minY

  const imgAR = img.naturalWidth / img.naturalHeight
  let dw = w, dh = h
  if (imgAR > w / h) { dh = h; dw = h * imgAR } else { dw = w; dh = w / imgAR }

  ctx.drawImage(img, minX - (dw - w) / 2, minY - (dh - h) / 2, dw, dh)
  ctx.restore()
}

export function render(state: RenderState) {
  const {
    canvas, images, tiles, panX, panY, zoom, nightMode,
    tileSize, animOffset, speed = 1, shape = 'spiral', spread = 1, radius = 0,
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
        ...tile, x, y, depth,
        size: tile.size * depthScale / (0.5 + ((tile.depth ?? 0) + 1) * 0.35),
      }
    }).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
  } else if (shape === 'cube') {
    const faceSize = spread * 160
    const rotY = t * 0.4
    const rotX = t * 0.25

    // Rotate a 3D point
    const rot3d = (x: number, y: number, z: number) => {
      // Rotate Y
      const x1 = x * Math.cos(rotY) - z * Math.sin(rotY)
      const z1 = x * Math.sin(rotY) + z * Math.cos(rotY)
      // Rotate X
      const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX)
      const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX)
      return { x: x1, y: y2, z: z2 }
    }

    // Build rotated cube corners
    const half = faceSize * 0.5
    const corners: Record<string, {x:number,y:number,z:number}> = {}
    for (const xv of [-1, 1]) for (const yv of [-1, 1]) for (const zv of [-1, 1]) {
      const key = `${xv},${yv},${zv}`
      corners[key] = rot3d(xv * half, yv * half, zv * half)
    }

    const project = (p: {x:number,y:number,z:number}) => ({ x: p.x, y: p.y })

    // Face definitions: 4 corners each (in order), normal for depth
    const faceCorners = [
      // front (nz=1)
      [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
      // back (nz=-1)
      [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]],
      // left (nx=-1)
      [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],
      // right (nx=1)
      [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],
      // top (ny=-1)
      [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]],
      // bottom (ny=1)
      [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],
    ] as [number,number,number][][]

    const faceNormals = [
      {x:0,y:0,z:1},{x:0,y:0,z:-1},{x:-1,y:0,z:0},
      {x:1,y:0,z:0},{x:0,y:-1,z:0},{x:0,y:1,z:0},
    ]

    animatedTiles = tiles.map((tile, fi) => {
      const fc = faceCorners[tile.cubeFace ?? fi % 6]
      const fn = faceNormals[tile.cubeFace ?? fi % 6]
      const rotNormal = rot3d(fn.x, fn.y, fn.z)
      return {
        ...tile,
        depth: rotNormal.z,
        // store projected corners for face drawing
        _faceCorners: fc.map(([x,y,z]) => project(corners[`${x},${y},${z}`])),
      } as any
    }).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
  }

  ctx.save()
  ctx.translate(W / 2 + panX, H / 2 + panY)
  ctx.scale(zoom, zoom)

  for (let i = 0; i < animatedTiles.length; i++) {
    const tile = animatedTiles[i] as any
    const img = images[tile.imageIndex % images.length]
    if (!img || !img.complete || !img.naturalWidth) continue

    let drawX = tile.x
    let drawY = tile.y
    let drawAngle = tile.angle
    let alpha = 1

    if (shape === 'spiral' && tile.baseAngle !== undefined) {
      const animAngle = tile.baseAngle + t * 0.8
      drawX = Math.cos(animAngle) * tile.baseRadius
      drawY = Math.sin(animAngle) * tile.baseRadius
      drawAngle = 0
    } else if (shape === 'orbit' && tile.baseAngle !== undefined) {
      const ringSpeed = 1 / (1 + (tile.ringIndex ?? 0) * 0.3)
      const animAngle = tile.baseAngle + t * ringSpeed
      drawX = Math.cos(animAngle) * tile.baseRadius
      drawY = Math.sin(animAngle) * tile.baseRadius
      drawAngle = 0
    } else if (shape === 'cube') {
      // Draw cube face as a filled quad
      const depth = tile.depth ?? 0
      // Back-face cull: skip faces pointing away
      if (depth < -0.1) continue
      alpha = 0.5 + depth * 0.5

      const fc = tile._faceCorners
      if (fc && fc.length === 4) {
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowColor = nightMode ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.15)'
        ctx.shadowBlur = 16 / zoom
        ctx.shadowOffsetY = 4 / zoom
        drawImageOnFace(ctx, img, fc[0], fc[1], fc[2], fc[3], radius / zoom)
        // Subtle edge
        ctx.beginPath()
        ctx.moveTo(fc[0].x, fc[0].y)
        fc.forEach((p: any) => ctx.lineTo(p.x, p.y))
        ctx.closePath()
        ctx.strokeStyle = nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
        ctx.lineWidth = 1 / zoom
        ctx.stroke()
        ctx.restore()
      }
      continue
    } else if (shape === 'globe') {
      const depth = tile.depth ?? 0
      alpha = 0.3 + (depth + 1) * 0.35
    }

    const s = tile.size * tileSize
    const hw = s / 2
    const cornerR = Math.min(radius / zoom, hw)

    ctx.save()
    ctx.translate(drawX, drawY)
    ctx.rotate(drawAngle)
    ctx.globalAlpha = alpha

    ctx.beginPath()
    drawRoundedRect(ctx, -hw, -hw, s, s, cornerR)
    ctx.clip()

    ctx.shadowColor = nightMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)'
    ctx.shadowBlur = 12 / zoom
    ctx.shadowOffsetY = 4 / zoom

    const imgAR = img.naturalWidth / img.naturalHeight
    let imgW = s, imgH = s, imgX = -hw, imgY = -hw
    if (imgAR > 1) { imgH = s; imgW = s * imgAR; imgX = -imgW / 2 }
    else { imgW = s; imgH = s / imgAR; imgY = -imgH / 2 }

    ctx.drawImage(img, imgX, imgY, imgW, imgH)
    ctx.globalAlpha = 1
    ctx.restore()
  }

  ctx.restore()
}

export function exportCanvas(
  images: HTMLImageElement[],
  tiles: Tile[],
  panX: number, panY: number,
  zoom: number,
  nightMode: boolean,
  tileSize: number,
  width = 2400, height = 1600,
  shape: ShapeType = 'spiral',
  spread = 1,
  radius = 0,
): string {
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  render({ canvas: offscreen, images, tiles, panX, panY, zoom, nightMode, tileSize, animOffset: 0, shape, spread, radius })
  return offscreen.toDataURL('image/png')
}
