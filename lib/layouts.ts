export interface Tile {
  x: number
  y: number
  size: number
  angle: number
  imageIndex: number
  // Shape-specific data for animation
  baseAngle?: number      // spiral/orbit: original angular position
  baseRadius?: number     // spiral/orbit: original radius
  ringIndex?: number      // orbit: which ring
  // Globe: spherical coords
  theta?: number          // longitude (around Y)
  phi?: number            // latitude (from pole)
  depth?: number          // z-depth for sorting/scaling
  // Cube: vertex position in normalized -1 to 1 space
  cubeVertex?: { x: number; y: number; z: number }
}

export interface LayoutParams {
  count: number
  spread: number
  size: number
  chaos?: number
  speed?: number
}

const GOLDEN_ANGLE = 2.39996 // radians

export function spiralLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const tiles: Tile[] = []
  const baseSpread = spread * 18

  for (let i = 0; i < count; i++) {
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
      imageIndex: i,
      baseAngle: angle,
      baseRadius: radius,
    })
  }
  return tiles
}

export function orbitLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const tiles: Tile[] = []

  // Distribute count across rings
  const rings = Math.max(1, Math.round(1 + spread * 3))
  let placed = 0

  for (let r = 0; r < rings && placed < count; r++) {
    const radius = r === 0 ? 0 : (r / rings) * spread * 220 + 60
    const perRing = r === 0 ? 1 : Math.min(Math.round(6 + r * 4), count - placed)
    const actualPerRing = Math.min(perRing, count - placed)

    for (let i = 0; i < actualPerRing && placed < count; i++) {
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
  const tiles: Tile[] = []
  const radius = spread * 180

  // Fibonacci sphere distribution for even coverage
  const goldenRatio = (1 + Math.sqrt(5)) / 2

  for (let i = 0; i < count; i++) {
    // Fibonacci sphere: evenly distribute points on sphere surface
    const theta = (2 * Math.PI * i) / goldenRatio  // longitude
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count)  // latitude from pole

    // Add chaos
    const chaosTheta = (Math.random() - 0.5) * chaos * 0.5
    const chaosPhi = (Math.random() - 0.5) * chaos * 0.3
    const finalTheta = theta + chaosTheta
    const finalPhi = phi + chaosPhi

    // Project to 2D (initial position, will be animated)
    const x = radius * Math.sin(finalPhi) * Math.cos(finalTheta)
    const y = radius * Math.cos(finalPhi)
    const z = radius * Math.sin(finalPhi) * Math.sin(finalTheta)

    // Depth for scaling (z normalized to -1 to 1)
    const depth = z / radius

    tiles.push({
      x,
      y,
      size: size * (0.5 + (depth + 1) * 0.35) * (1 + (Math.random() - 0.5) * chaos * 0.3),
      angle: (Math.random() - 0.5) * chaos * 0.4,
      imageIndex: i,
      theta: finalTheta,
      phi: finalPhi,
      depth,
    })
  }

  // Sort by depth so back tiles render first
  tiles.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))

  return tiles
}

export function cubeLayout(params: LayoutParams): Tile[] {
  const { count, spread, size, chaos = 0 } = params
  const tiles: Tile[] = []

  // Generate a 3D cube grid based on count
  // Count determines the grid size: 1-8 = 2x2x2, 9-27 = 3x3x3, etc.
  const gridSize = Math.max(2, Math.ceil(Math.cbrt(count)))
  const step = 2 / (gridSize - 1 || 1)  // Normalize to -1 to 1 range

  let placed = 0
  for (let xi = 0; xi < gridSize && placed < count; xi++) {
    for (let yi = 0; yi < gridSize && placed < count; yi++) {
      for (let zi = 0; zi < gridSize && placed < count; zi++) {
        const x = -1 + xi * step + (Math.random() - 0.5) * chaos * 0.3
        const y = -1 + yi * step + (Math.random() - 0.5) * chaos * 0.3
        const z = -1 + zi * step + (Math.random() - 0.5) * chaos * 0.3

        tiles.push({
          x: x * spread * 80,
          y: y * spread * 80,
          size: size * (1 + (Math.random() - 0.5) * chaos * 0.3),
          angle: 0,
          imageIndex: placed,
          cubeVertex: { x, y, z },
          depth: z,
        })
        placed++
      }
    }
  }

  // Sort by depth for initial render
  tiles.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))

  return tiles
}

export type ShapeType = 'spiral' | 'orbit' | 'globe' | 'cube'

export function computeLayout(shape: ShapeType, params: LayoutParams): Tile[] {
  switch (shape) {
    case 'spiral': return spiralLayout(params)
    case 'orbit': return orbitLayout(params)
    case 'globe': return globeLayout(params)
    case 'cube': return cubeLayout(params)
  }
}
