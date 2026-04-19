'use client'

interface Props {
  open: boolean
  onToggle: () => void
  nightMode: boolean
}

export default function PillToggle({ open, onToggle, nightMode }: Props) {
  const fg     = nightMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.38)'
  const bg     = nightMode ? 'rgba(40,40,40,0.88)'    : 'rgba(245,244,240,0.92)'
  const border = nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const keyBg  = nightMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'

  return (
    <button
      onClick={onToggle}
      aria-label={open ? 'Close command bar' : 'Open command bar (Space)'}
      className="fixed bottom-6 z-40 transition-all duration-200"
      style={{
        left: '50%',
        transform: `translateX(-50%) translateY(${open ? '8px' : '0px'})`,
        opacity: open ? 0 : 1,
        pointerEvents: open ? 'none' : 'all',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-full"
        style={{
          background: bg,
          border: `1px solid ${border}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          backdropFilter: 'blur(12px)',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          className="flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-mono leading-none tracking-wide"
          style={{
            background: keyBg,
            color: fg,
            border: `1px solid ${border}`,
            letterSpacing: '0.08em',
            paddingBottom: '3px',
          }}
        >
          space
        </span>
        <span className="text-[11px] tracking-wide" style={{ color: fg }}>
          to open
        </span>
      </div>
    </button>
  )
}
