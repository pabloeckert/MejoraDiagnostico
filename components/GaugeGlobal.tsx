'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  value: number
  onComplete?: () => void
  size?: 'sm' | 'lg'
  className?: string
}

const CX = 100, CY = 100, R = 70, NR = 55
const CALC_MS = 1200, ANIM_MS = 1500

// Standard math angles: 0°=right, 90°=up (y-flipped for SVG)
function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function arcSeg(cx: number, cy: number, r: number, a1: number, a2: number): string {
  const s = pt(cx, cy, r, a1)
  const e = pt(cx, cy, r, a2)
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export default function GaugeGlobal({ value, onComplete, size = 'lg', className }: Props) {
  const [phase, setPhase] = useState<'idle' | 'calc' | 'anim' | 'done'>('idle')
  const [needleDeg, setNeedleDeg] = useState(180)
  const [displayVal, setDisplayVal] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  // value=0 → 180° (LEFT), value=100 → 0° (RIGHT), passes through 90° (TOP) at 50%
  const targetDeg = 180 - (value / 100) * 180

  const startAnim = useCallback(() => {
    setPhase('anim')
    const t0 = performance.now()
    function frame(now: number) {
      const t = Math.min((now - t0) / ANIM_MS, 1)
      const e = easeOutCubic(t)
      setNeedleDeg(180 - e * (180 - targetDeg))
      setDisplayVal(Math.round(e * value))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        setNeedleDeg(targetDeg)
        setDisplayVal(value)
        setPhase('done')
        onComplete?.()
      }
    }
    rafRef.current = requestAnimationFrame(frame)
  }, [value, targetDeg, onComplete])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let tid: ReturnType<typeof setTimeout>
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase('calc')
          tid = setTimeout(startAnim, CALC_MS)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      clearTimeout(tid)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [startAnim])

  const needleEnd = pt(CX, CY, NR, needleDeg)

  const w = size === 'sm' ? 220 : 240
  const h = size === 'sm' ? 143 : 144
  const numFs = size === 'sm' ? '24' : '22'
  const lblFs = size === 'sm' ? '9' : '9'

  return (
    <div ref={containerRef} className={className ?? "flex flex-col items-center my-8"}>
      <svg viewBox="0 0 200 130" width={w} height={h} overflow="visible">
        {/* Tres zonas de fondo: rojo → naranja → verde */}
        <path d={arcSeg(CX, CY, R, 180, 120)} fill="none" stroke="#C0392B" strokeWidth={14} strokeLinecap="butt" />
        <path d={arcSeg(CX, CY, R, 120,  60)} fill="none" stroke="#E67E22" strokeWidth={14} strokeLinecap="butt" />
        <path d={arcSeg(CX, CY, R,  60,   0)} fill="none" stroke="#27AE60" strokeWidth={14} strokeLinecap="butt" />

        {/* Aguja */}
        <line
          x1={CX} y1={CY}
          x2={needleEnd.x.toFixed(2)} y2={needleEnd.y.toFixed(2)}
          stroke="#0D0D0D"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Punto central */}
        <circle cx={CX} cy={CY} r={5} fill="#0D0D0D" />

        {/* Número */}
        <text x={CX} y={114} textAnchor="middle" fontSize={numFs} fontWeight="700" fill="#0D0D0D">
          {phase === 'calc' ? '...' : `${displayVal}%`}
        </text>
        <text x={CX} y={126} textAnchor="middle" fontSize={lblFs} fill="#999999">
          puntaje global
        </text>
      </svg>
    </div>
  )
}
