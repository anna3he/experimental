export interface Tile {
  x: number
  y: number
  size: number
  angle: number
  imageIndex: number
  baseAngle?: number
  baseRadius?: number
  ringIndex?: number
  theta?: number
  phi?: number
  depth?: number
  cubeVertex?: { x: number; y: number; z: number }
  cubeFace?: number
}

export interface LayoutParams {
  count: number
  spread: number
  size: number
  radius?: number
  chaos?: number
  speed?: number
}

const GOLDEN_ANGLE = 2.39996

const SHAPE_MIN_TILES: Record<string, number> = {
  spiral: 24,
  orbit: 16,
  globe: 20,
  cube: 6, // 6 faces
}

function imageIdx(i: number): number {
  return i
}

export function spiralLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const n = Math.max(count, SHAPE_MIN_TILES.spiral)
  const baseSpread = spread * 28
  const tiles: Tile[] = []

  for (let i = 0; i < n; i++) {
    const angle = i * GOLDEN_ANGLE
    const radius = baseSpread * Math.sqrt(i)
    const chaosX = (Math.random() - 0.5) * chaos * 60
    const chaosY = (Math.random() - 0.5) * chaos * 60
    const tileAngle = (Math.random() - 0.5) * chaos * 0.6

    tiles.push({
      x: Math.cos(angle) * radius + chaosX,
      y: Math.sin(angle) * radius + chaosY,
      size: size * (1 + (Math.random() - 0.5) * chaos * 0.4),
      angle: tileAngle,
      imageIndex: imageIdx(i),
      baseAngle: angle,
      baseRadius: radius,
    })
  }
  return tiles
}

export function orbitLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const n = Math.max(count, SHAPE_MIN_TILES.orbit)
  const tiles: Tile[] = []
  const rings = Math.max(1, Math.round(1 + spread * 3))
  let placed = 0

  for (let r = 0; r < rings && placed < n; r++) {
    const radius = r === 0 ? 0 : (r / rings) * spread * 220 + 60
    const perRing = r === 0 ? 1 : Math.min(Math.round(6 + r * 4), n - placed)
    const actualPerRing = Math.min(perRing, n - placed)

    for (let i = 0; i < actualPerRing && placed < n; i++) {
      const angle = (i / actualPerRing) * Math.PI * 2 + r * 0.5
      const chaosR = (Math.random() - 0.5) * chaos * radius * 0.3
      const chaosA = (Math.random() - 0.5) * chaos * 0.3
      const actualAngle = angle + chaosA
      const actualRadius = Math.max(0, radius + chaosR)

      tiles.push({
        x: Math.cos(actualAngle) * actualRadius,
        y: Math.sin(actualAngle) * actualRadius,
        size: size * (1 + (Math.random() - 0.5) * chaos * 0.4),
        angle: (Math.random() - 0.5) * chaos * 0.5,
        imageIndex: imageIdx(placed),
        baseAngle: angle,
        baseRadius: actualRadius,
        ringIndex: r,
      })
      placed++
    }
  }
  return tiles
}

export function globeLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const n = Math.max(count, SHAPE_MIN_TILES.globe)
  const tiles: Tile[] = []
  const radius = spread * 180
  const goldenRatio = (1 + Math.sqrt(5)) / 2

  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n)
    const finalTheta = theta + (Math.random() - 0.5) * chaos * 0.5
    const finalPhi = phi + (Math.random() - 0.5) * chaos * 0.3

    const x = radius * Math.sin(finalPhi) * Math.cos(finalTheta)
    const y = radius * Math.cos(finalPhi)
    const z = radius * Math.sin(finalPhi) * Math.sin(finalTheta)
    const depth = z / radius

    tiles.push({
      x, y,
      size: size * (0.5 + (depth + 1) * 0.35) * (1 + (Math.random() - 0.5) * chaos * 0.3),
      angle: (Math.random() - 0.5) * chaos * 0.4,
      imageIndex: imageIdx(i),
      theta: finalTheta,
      phi: finalPhi,
      depth,
    })
  }

  tiles.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
  return tiles
}

// Cube: one image tile per face, filling each face completely.
// count controls how many faces are shown (1-6). Default shows all 6.
export function cubeLayout(params: LayoutParams): Tile[] {
  const { count, spread, size } = params
  const tiles: Tile[] = []

  // 6 faces: front, back, left, right, top, bottom
  // Each face defined by its center normal and up vector
  const faceSize = spread * 160

  const faces = [
    { nx: 0,  ny: 0,  nz: 1,  label: 'front'  },
    { nx: 0,  ny: 0,  nz: -1, label: 'back'   },
    { nx: -1, ny: 0,  nz: 0,  label: 'left'   },
    { nx: 1,  ny: 0,  nz: 0,  label: 'right'  },
    { nx: 0,  ny: -1, nz: 0,  label: 'top'    },
    { nx: 0,  ny: 1,  nz: 0,  label: 'bottom' },
  ]

  // count maps to how many faces to show (min 1, max 6)
  const numFaces = Math.min(6, Math.max(1, Math.round((count / 35) * 6) || 6))
  const activeFaces = faces.slice(0, numFaces)

  activeFaces.forEach((face, fi) => {
    // Place tile at face center (half faceSize out along normal)
    const cx = face.nx * faceSize * 0.5
    const cy = face.ny * faceSize * 0.5
    const cz = face.nz * faceSize * 0.5

    tiles.push({
      x: cx,
      y: cy,
      size: size,
      angle: 0,
      imageIndex: imageIdx(fi),
      cubeVertex: { x: face.nx, y: face.ny, z: face.nz },
      depth: cz,
      cubeFace: fi,
    })
  })

  tiles.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
  return tiles
}

export type ShapeType = 'spiral' | 'orbit' | 'globe' | 'cube'

export function computeLayout(shape: ShapeType, params: LayoutParams): Tile[] {
  switch (shape) {
    case 'spiral': return spiralLayout(params)
    case 'orbit':  return orbitLayout(params)
    case 'globe':  return globeLayout(params)
    case 'cube':   return cubeLayout(params)
  }
}
