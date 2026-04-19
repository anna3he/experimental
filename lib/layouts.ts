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

// How many tiles each shape needs to look complete regardless of count
const SHAPE_MIN_TILES: Record<string, number> = {
  spiral: 24,
  orbit: 16,
  globe: 20,
  cube: 8,
}

// Repeat imageIndex so tiles always cycle through available images
function imageIndex(i: number, _total: number): number {
  return i
}

export function spiralLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const tiles: Tile[] = []

  // Always render at least SHAPE_MIN_TILES tiles so shape is obvious
  const n = Math.max(count, SHAPE_MIN_TILES.spiral)
  // Tighter, more visible spiral: larger base spread
  const baseSpread = spread * 28

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
      imageIndex: imageIndex(i, n),
      baseAngle: angle,
      baseRadius: radius,
    })
  }
  return tiles
}

export function orbitLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const tiles: Tile[] = []
  const n = Math.max(count, SHAPE_MIN_TILES.orbit)

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
      const tileAngle = (Math.random() - 0.5) * chaos * 0.5

      tiles.push({
        x: Math.cos(actualAngle) * actualRadius,
        y: Math.sin(actualAngle) * actualRadius,
        size: size * (1 + (Math.random() - 0.5) * chaos * 0.4),
        angle: tileAngle,
        imageIndex: imageIndex(placed, n),
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
  const tiles: Tile[] = []
  const n = Math.max(count, SHAPE_MIN_TILES.globe)
  const radius = spread * 180
  const goldenRatio = (1 + Math.sqrt(5)) / 2

  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n)
    const chaosTheta = (Math.random() - 0.5) * chaos * 0.5
    const chaosPhi = (Math.random() - 0.5) * chaos * 0.3
    const finalTheta = theta + chaosTheta
    const finalPhi = phi + chaosPhi

    const x = radius * Math.sin(finalPhi) * Math.cos(finalTheta)
    const y = radius * Math.cos(finalPhi)
    const z = radius * Math.sin(finalPhi) * Math.sin(finalTheta)
    const depth = z / radius

    tiles.push({
      x,
      y,
      size: size * (0.5 + (depth + 1) * 0.35) * (1 + (Math.random() - 0.5) * chaos * 0.3),
      angle: (Math.random() - 0.5) * chaos * 0.4,
      imageIndex: imageIndex(i, n),
      theta: finalTheta,
      phi: finalPhi,
      depth,
    })
  }

  tiles.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
  return tiles
}

export function cubeLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const tiles: Tile[] = []
  const n = Math.max(count, SHAPE_MIN_TILES.cube)

  const gridSize = Math.max(2, Math.ceil(Math.cbrt(n)))
  const step = 2 / (gridSize - 1 || 1)

  let placed = 0
  for (let xi = 0; xi < gridSize && placed < n; xi++) {
    for (let yi = 0; yi < gridSize && placed < n; yi++) {
      for (let zi = 0; zi < gridSize && placed < n; zi++) {
        const x = -1 + xi * step + (Math.random() - 0.5) * chaos * 0.3
        const y = -1 + yi * step + (Math.random() - 0.5) * chaos * 0.3
        const z = -1 + zi * step + (Math.random() - 0.5) * chaos * 0.3

        tiles.push({
          x: x * spread * 80,
          y: y * spread * 80,
          size: size * (1 + (Math.random() - 0.5) * chaos * 0.3),
          angle: 0,
          imageIndex: imageIndex(placed, n),
          cubeVertex: { x, y, z },
          depth: z,
        })
        placed++
      }
    }
  }

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
