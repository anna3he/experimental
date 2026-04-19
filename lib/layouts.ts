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

// Size multipliers per shape — tuned so the shape is readable at default size=1
// User scrubs size to go bigger/smaller from this baseline
const SIZE_SCALE = {
  spiral: 0.55, // tiles shrink toward center anyway, this keeps outer tiles reasonable
  orbit:  0.45, // small enough that ring gaps are visible
  globe:  0.50, // sphere surface readable without overlap
  cube:   0.70, // grid readable, tiles fill their cell but don't overlap
}

export function spiralLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const n = Math.max(count, 24)
  const baseSpread = spread * 28
  const tiles: Tile[] = []

  for (let i = 0; i < n; i++) {
    const angle = i * GOLDEN_ANGLE
    const radius = baseSpread * Math.sqrt(i)
    // Tiles scale up along the arm — inner tiles small, outer tiles larger
    const scaledSize = size * SIZE_SCALE.spiral * (0.4 + (i / n) * 0.6)
    tiles.push({
      x: Math.cos(angle) * radius + (Math.random() - 0.5) * chaos * 60,
      y: Math.sin(angle) * radius + (Math.random() - 0.5) * chaos * 60,
      size: scaledSize * (1 + (Math.random() - 0.5) * chaos * 0.4),
      angle: (Math.random() - 0.5) * chaos * 0.6,
      imageIndex: i,
      baseAngle: angle,
      baseRadius: radius,
    })
  }
  return tiles
}

export function orbitLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const n = Math.max(count, 16)
  const tiles: Tile[] = []
  const rings = Math.max(1, Math.round(1 + spread * 3))
  let placed = 0

  for (let r = 0; r < rings && placed < n; r++) {
    const radius = r === 0 ? 0 : (r / rings) * spread * 220 + 60
    const actualPerRing = Math.min(
      r === 0 ? 1 : Math.round(6 + r * 4),
      n - placed
    )
    for (let i = 0; i < actualPerRing && placed < n; i++) {
      const angle = (i / actualPerRing) * Math.PI * 2 + r * 0.5
      const actualAngle = angle + (Math.random() - 0.5) * chaos * 0.3
      const actualRadius = Math.max(0, radius + (Math.random() - 0.5) * chaos * radius * 0.3)
      tiles.push({
        x: Math.cos(actualAngle) * actualRadius,
        y: Math.sin(actualAngle) * actualRadius,
        size: size * SIZE_SCALE.orbit * (1 + (Math.random() - 0.5) * chaos * 0.4),
        angle: (Math.random() - 0.5) * chaos * 0.5,
        imageIndex: placed,
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
  const n = Math.max(count, 20)
  const tiles: Tile[] = []
  const radius = spread * 160
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
      size: size * SIZE_SCALE.globe * (0.7 + (depth + 1) * 0.2) * (1 + (Math.random() - 0.5) * chaos * 0.3),
      angle: (Math.random() - 0.5) * chaos * 0.4,
      imageIndex: i,
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

  // count → grid dimension
  // 1–4  → 2×2×2  (8 tiles)
  // 5–13 → 3×3×3  (27 tiles)
  // 14+  → 4×4×4  (64 tiles)
  const gridSize = count <= 4 ? 2 : count <= 13 ? 3 : 4
  const totalInGrid = gridSize * gridSize * gridSize
  const step = spread * 52
  const offset = ((gridSize - 1) / 2) * step

  let placed = 0
  outer: for (let xi = 0; xi < gridSize; xi++) {
    for (let yi = 0; yi < gridSize; yi++) {
      for (let zi = 0; zi < gridSize; zi++) {
        tiles.push({
          x: xi * step - offset + (Math.random() - 0.5) * chaos * 10,
          y: yi * step - offset + (Math.random() - 0.5) * chaos * 10,
          size: size * SIZE_SCALE.cube,
          angle: (Math.random() - 0.5) * chaos * 0.3,
          imageIndex: placed,
          cubeVertex: {
            x: xi / Math.max(gridSize - 1, 1) - 0.5,
            y: yi / Math.max(gridSize - 1, 1) - 0.5,
            z: zi / Math.max(gridSize - 1, 1) - 0.5,
          },
          depth: zi * step - offset,
        })
        placed++
        if (placed >= totalInGrid) break outer
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
