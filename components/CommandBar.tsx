'use client'

import { useRef, useCallback } from 'react'
import ShapePreviewCanvas from './ShapePreviewCanvas'
import DialKnob from './DialKnob'
import type { ShapeType } from '@/lib/layouts'

export interface DialParams {
  count: number
  spread: number
  size: number
  radius: number
  speed: number
}

interface Props {
  open: boolean
  shape: ShapeType
  params: DialParams
  nightMode: boolean
  focusedDial: keyof DialParams | null
  imageCount: number
  onShapeChange: (s: ShapeType) => void
  onParamChange: (k: keyof DialParams, v: number) => void
  onFocusDial: (k: keyof DialParams | null) => void
  onUpload: (files: FileList) => void
  onNightModeToggle: () => void
  onExport: () => void
  onManagePhotos: () => void
  onResetPhotos: () => void
}

const SHAPES: { id: ShapeType; label: string }[] = [
  { id: 'spiral', label: 'Spiral' },
  { id: 'orbit',  label: 'Orbit'  },
  { id: 'globe',  label: 'Globe'  },
  { id: 'cube',   label: 'Cube'   },
]

const DIALS: {
  key: keyof DialParams
  label: string
  min: number
  max: number
  step: number
}[] = [
  { key: 'count',  label: 'Count',  min: 1,   max: 35,  step: 1   },
  { key: 'spread', label: 'Spread', min: 0.2,  max: 5,   step: 0.1 },
  { key: 'size',   label: 'Size',   min: 0.3,  max: 3,   step: 0.1 },
  { key: 'radius', label: 'Radius', min: 0,    max: 24,  step: 1   },
  { key: 'speed',  label: 'Speed',  min: 0,    max: 3,   step: 0.1 },
]

export default function CommandBar({
  open,
  shape,
  params,
  nightMode,
  focusedDial,
  imageCount,
  onShapeChange,
  onParamChange,
  onFocusDial,
  onUpload,
  onNightModeToggle,
  onExport,
  onManagePhotos,
  onResetPhotos,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) onUpload(e.target.files)
      e.target.value = ''
    },
    [onUpload]
  )

  const bg     = nightMode ? 'rgba(20,20,20,0.95)'    : 'rgba(255,254,250,0.97)'
  const border = nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const btnBg  = nightMode ? '#2a2a2a'                : '#eeecea'
  const btnFg  = nightMode ? '#ccc'                   : '#444'
  const mutedFg = nightMode ? '#555'                  : '#bbb'

  return (
    <>
      <div
        className="fixed bottom-6 left-1/2 z-50"
        style={{
          transform: `translateX(-50%) translateY(${open ? '0' : '12px'})`,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease',
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="flex items-end gap-5 px-5 py-4 rounded-2xl"
          style={{
            background: bg,
            border: `1px solid ${border}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Shape selectors */}
          <div className="flex items-end gap-2">
            {SHAPES.map((s) => (
              <ShapePreviewCanvas
                key={s.id}
                shape={s.id}
                active={shape === s.id}
                nightMode={nightMode}
                onClick={() => onShapeChange(s.id)}
                label={s.label}
              />
            ))}
          </div>

          <div className="self-stretch w-px mx-1" style={{ background: border }} />

          {/* Dials */}
          <div className="flex items-end gap-4">
            {DIALS.map((d) => (
              <DialKnob
                key={d.key}
                label={d.label}
                value={params[d.key]}
                min={d.min}
                max={d.max}
                step={d.step}
                focused={focusedDial === d.key}
                onFocus={() => onFocusDial(d.key)}
                onChange={(v) => onParamChange(d.key, v)}
                nightMode={nightMode}
              />
            ))}
          </div>

          <div className="self-stretch w-px mx-1" style={{ background: border }} />

          {/* Actions */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              {/* Upload */}
              <button
                onClick={() => fileRef.current?.click()}
                title="Upload photos"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: btnBg, color: btnFg }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Night mode */}
              <button
                onClick={onNightModeToggle}
                title={nightMode ? 'Light mode' : 'Night mode'}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: btnBg, color: btnFg }}
              >
                {nightMode ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Export / download */}
              <button
                onClick={onExport}
                title="Export PNG"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: btnBg, color: btnFg }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 10V2M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Photos label row — clickable to manage, with inline reset */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={imageCount > 0 ? onManagePhotos : undefined}
                className="text-[9px] tracking-widest uppercase font-medium transition-colors flex items-center gap-1"
                style={{
                  color: imageCount > 0 ? (nightMode ? '#888' : '#999') : mutedFg,
                  cursor: imageCount > 0 ? 'pointer' : 'default',
                }}
                disabled={imageCount === 0}
              >
                {imageCount > 0 ? (
                  <>
                    {/* small photo icon */}
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="4" cy="5" r="1" stroke="currentColor" strokeWidth="1"/>
                      <path d="M1 8l2.5-2.5L5 7l2-2 4 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {imageCount} photo{imageCount !== 1 ? 's' : ''}
                  </>
                ) : (
                  'no photos'
                )}
              </button>

              {/* Inline reset button — only when photos exist */}
              {imageCount > 0 && (
                <button
                  onClick={onResetPhotos}
                  title="Remove all photos"
                  className="flex items-center justify-center transition-colors"
                  style={{ color: mutedFg }}
                >
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  )
}
