// Mini dot diagram renderers for the command bar shape selector
const GOLDEN_ANGLE = 2.39996

export type PreviewShape = 'spiral' | 'orbit' | 'globe' | 'cube'

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
  nightMode: boolean
) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.globalAlpha = alpha
  ctx.fillStyle = nightMode ? '#e0e0e0' : '#1a1a1a'
  ctx.fill()
  ctx.globalAlpha = 1
}

export function drawShapePreview(
  canvas: HTMLCanvasElement,
  shape: PreviewShape,
  active: boolean,
  nightMode: boolean
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height
  const cx = W / 2
  const cy = H / 2

  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = active
    ? nightMode ? '#2a2a2a' : '#1a1a1a'
    : nightMode ? '#1a1a1a' : '#f0efeb'
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 8)
  ctx.fill()

  const dotColor = active
    ? nightMode ? '#ffffff' : '#ffffff'
    : nightMode ? '#cccccc' : '#3a3a3a'

  const N = 18

  switch (shape) {
    case 'spiral': {
      for (let i = 0; i < N; i++) {
        const angle = i * GOLDEN_ANGLE
        const r = 6 * Math.sqrt(i)
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        const radius = 1.2 + (N - i) * 0.05
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.globalAlpha = 0.5 + 0.5 * (i / N)
        ctx.fill()
      }
      break
    }
    case 'orbit': {
      // Center
      dot(ctx, cx, cy, 1.8, 0.9, active ? false : nightMode)
      ctx.fillStyle = dotColor
      ctx.fill()

      const rings = [
        { r: 7, n: 5 },
        { r: 14, n: 9 },
      ]
      rings.forEach(({ r, n }) => {
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * Math.PI * 2
          const x = cx + Math.cos(angle) * r
          const y = cy + Math.sin(angle) * r
          ctx.beginPath()
          ctx.arc(x, y, 1.2, 0, Math.PI * 2)
          ctx.fillStyle = dotColor
          ctx.globalAlpha = 0.8
          ctx.fill()
        }
      })
      break
    }
    case 'globe': {
      // Draw a 3D sphere wireframe with dots
      const radius = 14
      const goldenRatio = (1 + Math.sqrt(5)) / 2
      const count = 20

      // Draw an ellipse outline for the globe
      ctx.beginPath()
      ctx.ellipse(cx, cy, radius, radius, 0, 0, Math.PI * 2)
      ctx.strokeStyle = dotColor
      ctx.globalAlpha = 0.2
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Fibonacci sphere points
      for (let i = 0; i < count; i++) {
        const theta = (2 * Math.PI * i) / goldenRatio
        const phi = Math.acos(1 - (2 * (i + 0.5)) / count)

        // 3D to 2D projection (slight tilt)
        const x3d = Math.sin(phi) * Math.cos(theta)
        const y3d = Math.cos(phi)
        const z3d = Math.sin(phi) * Math.sin(theta)

        // Simple orthographic projection with slight rotation
        const x = cx + x3d * radius
        const y = cy + y3d * radius * 0.85  // Slight vertical compression

        // Depth-based size and alpha
        const depth = z3d
        const dotRadius = 0.8 + (depth + 1) * 0.5
        const alpha = 0.3 + (depth + 1) * 0.35

        ctx.beginPath()
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.globalAlpha = alpha
        ctx.fill()
      }
      break
    }
    case 'cube': {
      // Draw a 3D cube wireframe with dots at vertices
      const size = 12

      // 8 vertices of a cube centered at origin
      const vertices = [
        { x: -1, y: -1, z: -1 },
        { x:  1, y: -1, z: -1 },
        { x:  1, y:  1, z: -1 },
        { x: -1, y:  1, z: -1 },
        { x: -1, y: -1, z:  1 },
        { x:  1, y: -1, z:  1 },
        { x:  1, y:  1, z:  1 },
        { x: -1, y:  1, z:  1 },
      ]

      // Simple rotation for visual interest
      const rotY = 0.5
      const rotX = 0.3

      const projected = vertices.map(v => {
        // Rotate Y
        const x1 = v.x * Math.cos(rotY) - v.z * Math.sin(rotY)
        const z1 = v.x * Math.sin(rotY) + v.z * Math.cos(rotY)
        // Rotate X
        const y2 = v.y * Math.cos(rotX) - z1 * Math.sin(rotX)
        const z2 = v.y * Math.sin(rotX) + z1 * Math.cos(rotX)
        return {
          x: cx + x1 * size,
          y: cy + y2 * size,
          z: z2,
        }
      })

      // Draw edges
      const edges = [
        [0,1],[1,2],[2,3],[3,0],  // front face
        [4,5],[5,6],[6,7],[7,4],  // back face
        [0,4],[1,5],[2,6],[3,7],  // connecting edges
      ]

      ctx.beginPath()
      edges.forEach(([a, b]) => {
        ctx.moveTo(projected[a].x, projected[a].y)
        ctx.lineTo(projected[b].x, projected[b].y)
      })
      ctx.strokeStyle = dotColor
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Draw dots at vertices
      projected
        .sort((a, b) => a.z - b.z)
        .forEach(p => {
          const alpha = 0.4 + (p.z + 1) * 0.3
          const radius = 1.2 + (p.z + 1) * 0.5
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
          ctx.fillStyle = dotColor
          ctx.globalAlpha = alpha
          ctx.fill()
        })
      break
    }
  }

  ctx.globalAlpha = 1
}
