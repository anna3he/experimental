'use client'

import { useState } from 'react'

interface Props {
  open: boolean
  images: HTMLImageElement[]
  nightMode: boolean
  onClose: () => void
  onDelete: (indices: number[]) => void
  onReset: () => void
}

export default function PhotoManageModal({
  open,
  images,
  nightMode,
  onClose,
  onDelete,
  onReset,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  if (!open) return null

  const bg = nightMode ? 'rgba(10,10,10,0.95)' : 'rgba(255,254,250,0.97)'
  const border = nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const textColor = nightMode ? '#e0e0e0' : '#1a1a1a'
  const mutedColor = nightMode ? '#666' : '#999'

  const toggleSelect = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleDeleteSelected = () => {
    if (selected.size > 0) {
      onDelete(Array.from(selected))
      setSelected(new Set())
    }
  }

  const handleReset = () => {
    onReset()
    setSelected(new Set())
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: nightMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{
          background: bg,
          border: `1px solid ${border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <h2 className="text-sm font-medium" style={{ color: textColor }}>
            Manage Photos ({images.length})
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: nightMode ? '#2a2a2a' : '#eee',
              color: nightMode ? '#888' : '#666',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Photo grid */}
        <div className="p-4 max-h-[300px] overflow-y-auto">
          {images.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: mutedColor }}>
              No photos uploaded
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => toggleSelect(i)}
                  className="relative aspect-square rounded-lg overflow-hidden transition-all"
                  style={{
                    outline: selected.has(i) 
                      ? '2px solid #ef4444' 
                      : '2px solid transparent',
                    outlineOffset: '-2px',
                    opacity: selected.has(i) ? 0.7 : 1,
                  }}
                >
                  <img
                    src={img.src}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {selected.has(i) && (
                    <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: nightMode ? '#2a2a2a' : '#eee',
              color: nightMode ? '#888' : '#666',
            }}
          >
            Reset All
          </button>

          <div className="flex gap-2">
            {selected.size > 0 && (
              <span className="text-xs self-center mr-2" style={{ color: mutedColor }}>
                {selected.size} selected
              </span>
            )}
            <button
              onClick={handleDeleteSelected}
              disabled={selected.size === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: selected.size > 0 ? '#ef4444' : nightMode ? '#2a2a2a' : '#eee',
                color: selected.size > 0 ? '#fff' : nightMode ? '#555' : '#bbb',
                cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Delete Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
