'use client'

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { computeLayout, type ShapeType, type Tile } from '@/lib/layouts'
import { render as renderCanvas, exportCanvas } from '@/lib/renderer'
import CommandBar, { type DialParams } from './CommandBar'
import PillToggle from './PillToggle'
import EmptyState from './EmptyState'
import PhotoManageModal from './PhotoManageModal'

const MAX_IMAGES = 35

// Seeded random for stable chaos
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function buildSeededLayout(
  shape: ShapeType,
  params: DialParams,
  seed: number
): Tile[] {
  // Override Math.random with seeded version during layout computation
  let idx = 0
  const origRand = Math.random
  Math.random = () => seededRandom(seed + idx++)
  const tiles = computeLayout(shape, params)
  Math.random = origRand
  return tiles
}

export default function DialKit() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const animOffsetRef = useRef(0)

  // Images
  const [images, setImages] = useState<HTMLImageElement[]>([])

  // Viewport
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [zoom, setZoom] = useState(1)

  // Layout state
  const [shape, setShape] = useState<ShapeType>('spiral')
  const [params, setParams] = useState<DialParams>({
    count: 12,
    spread: 1,
    size: 1,
    speed: 1,
  })
  const [layoutSeed, setLayoutSeed] = useState(42)

  // UI state
  const [barOpen, setBarOpen] = useState(false)
  const [nightMode, setNightMode] = useState(false)
  const [focusedDial, setFocusedDial] = useState<keyof DialParams | null>(null)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)

  // Tiles
  const tiles = useMemo(
    () => buildSeededLayout(shape, params, layoutSeed),
    [shape, params, layoutSeed]
  )

  // Refresh layout seed on shape change or chaos scrub completion
  const refreshSeed = useCallback(() => {
    setLayoutSeed((s) => s + 1)
  }, [])

  // ----- Image loading -----
  const handleUpload = useCallback((files: FileList) => {
    const arr = Array.from(files).slice(0, MAX_IMAGES)
    setImages((prev) => {
      const remaining = MAX_IMAGES - prev.length
      const toLoad = arr.slice(0, remaining)
      const newImgs = toLoad.map((file) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = URL.createObjectURL(file)
        return img
      })
      return [...prev, ...newImgs]
    })
  }, [])

  // Also allow dropping onto the canvas
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files)
    },
    [handleUpload]
  )

  // ----- Pan & zoom -----
  const isPanning = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const lastTouchDist = useRef<number | null>(null)
  const lastTouchMid = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (barOpen && e.target === e.currentTarget) {
        setBarOpen(false)
        setFocusedDial(null)
        return
      }
      isPanning.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
    },
    [barOpen]
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    setPanX((p) => p + dx)
    setPanY((p) => p + dy)
    lastPointer.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  // Scroll: zoom or param scrub
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      if (focusedDial) {
        // Scrub focused dial
        const dialConfig = {
          count: { min: 1, max: 35, step: 1 },
          spread: { min: 0.2, max: 5, step: 0.1 },
          size: { min: 0.3, max: 3, step: 0.1 },
          speed: { min: 0, max: 3, step: 0.1 },
        }
        const cfg = dialConfig[focusedDial]
        const dir = e.deltaY > 0 ? -1 : 1
        setParams((p) => {
          const raw = p[focusedDial] + dir * cfg.step
          const clamped = Math.min(cfg.max, Math.max(cfg.min, raw))
          const rounded = Math.round(clamped / cfg.step) * cfg.step
          return { ...p, [focusedDial]: rounded }
        })
      } else {
        // Zoom
        const factor = e.deltaY > 0 ? 0.93 : 1.075
        setZoom((z) => Math.min(8, Math.max(0.08, z * factor)))
      }
    },
    [focusedDial]
  )

  // Touch pinch-zoom
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
      lastTouchMid.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    } else if (e.touches.length === 1) {
      isPanning.current = true
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const factor = dist / lastTouchDist.current
      setZoom((z) => Math.min(8, Math.max(0.08, z * factor)))
      lastTouchDist.current = dist
    } else if (e.touches.length === 1 && isPanning.current) {
      const dx = e.touches[0].clientX - lastPointer.current.x
      const dy = e.touches[0].clientY - lastPointer.current.y
      setPanX((p) => p + dx)
      setPanY((p) => p + dy)
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false
    lastTouchDist.current = null
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      if (e.code === 'Space') {
        e.preventDefault()
        setBarOpen((o) => !o)
        if (barOpen) setFocusedDial(null)
      } else if (e.key === 'Escape') {
        setBarOpen(false)
        setFocusedDial(null)
      } else if (e.key === '1') setShape('spiral')
      else if (e.key === '2') setShape('orbit')
      else if (e.key === '3') setShape('globe')
      else if (e.key === '4') setShape('cube')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [barOpen])

  // Wheel listener (non-passive)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd)
    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd])

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio
      canvas.height = window.innerHeight * window.devicePixelRatio
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const loop = (ts: number) => {
      animOffsetRef.current = ts
      const dpr = window.devicePixelRatio || 1

      renderCanvas({
        canvas,
        images,
        tiles,
        panX: panX * dpr,
        panY: panY * dpr,
        zoom,
        nightMode,
        tileSize: 120 * dpr,
        animOffset: ts,
        speed: params.speed,
        shape,
        spread: params.spread,
      })

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [images, tiles, panX, panY, zoom, nightMode, params.speed, params.spread, shape])

  // Export
  const handleExport = useCallback(() => {
    if (images.length === 0) return
    const dpr = window.devicePixelRatio || 1
    const url = exportCanvas(
      images,
      tiles,
      panX * dpr,
      panY * dpr,
      zoom,
      nightMode,
      120 * dpr,
      2400,
      1600,
      shape,
      params.spread
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `dialkit-${shape}-${Date.now()}.png`
    a.click()
  }, [images, tiles, panX, panY, zoom, nightMode, shape])

  const handleParamChange = useCallback((k: keyof DialParams, v: number) => {
    setParams((p) => ({ ...p, [k]: v }))
  }, [])

  const handleShapeChange = useCallback((s: ShapeType) => {
    setShape(s)
    refreshSeed()
  }, [refreshSeed])

  const handleDeletePhotos = useCallback((indices: number[]) => {
    setImages(prev => prev.filter((_, i) => !indices.includes(i)))
  }, [])

  const handleResetPhotos = useCallback(() => {
    setImages([])
  }, [])

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: nightMode ? '#0a0a0a' : '#f5f4f0' }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: 'block' }}
      />

      {images.length === 0 && (
        <EmptyState nightMode={nightMode} onUpload={handleUpload} />
      )}

      <PillToggle
        open={barOpen}
        onToggle={() => {
          setBarOpen((o) => !o)
          setFocusedDial(null)
        }}
        nightMode={nightMode}
      />

      <CommandBar
        open={barOpen}
        shape={shape}
        params={params}
        nightMode={nightMode}
        focusedDial={focusedDial}
        imageCount={images.length}
        onShapeChange={handleShapeChange}
        onParamChange={handleParamChange}
        onFocusDial={setFocusedDial}
        onUpload={handleUpload}
        onNightModeToggle={() => setNightMode((n) => !n)}
        onExport={handleExport}
        onManagePhotos={() => setPhotoModalOpen(true)}
      />

      <PhotoManageModal
        open={photoModalOpen}
        images={images}
        nightMode={nightMode}
        onClose={() => setPhotoModalOpen(false)}
        onDelete={handleDeletePhotos}
        onReset={handleResetPhotos}
      />
    </div>
  )
}
