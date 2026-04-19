'use client'

interface Props {
  nightMode: boolean
  onUpload: (files: FileList) => void
}

export default function EmptyState({ nightMode, onUpload }: Props) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length) onUpload(e.dataTransfer.files)
  }
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{ pointerEvents: 'all' }}
    >
      <div className="flex flex-col items-center gap-3 text-center select-none">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
          style={{
            background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: nightMode ? '#444' : '#bbb' }}
          >
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="8.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M3 16l4.5-4.5L11 15l3.5-3.5L21 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p
          className="text-sm font-medium"
          style={{ color: nightMode ? '#333' : '#bbb' }}
        >
          drop photos or press space
        </p>
      </div>
    </div>
  )
}
