'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { ComparisonMode } from '@/lib/ai/agents/types'

interface ImageComparisonProps {
  before: string
  after: string
  mode: ComparisonMode
  className?: string
}

export function ImageComparison({
  before,
  after,
  mode,
  className
}: ImageComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [opacity, setOpacity] = useState(0.5)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, percentage)))
  }
  
  if (mode === 'side-by-side') {
    return (
      <div className={cn('grid grid-cols-2 gap-4', className)}>
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Before</h4>
          <img
            src={before}
            alt="Before"
            className="w-full rounded-md border"
          />
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">After</h4>
          <img
            src={after}
            alt="After"
            className="w-full rounded-md border"
          />
        </div>
      </div>
    )
  }
  
  if (mode === 'overlay') {
    return (
      <div className={cn('relative', className)}>
        <img
          src={before}
          alt="Before"
          className="w-full rounded-md"
        />
        <img
          src={after}
          alt="After"
          className="absolute inset-0 w-full rounded-md"
          style={{ opacity }}
        />
        <div className="absolute bottom-4 left-4 right-4">
          <label className="text-xs text-white drop-shadow-md">
            Opacity: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity * 100}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="w-full"
          />
        </div>
      </div>
    )
  }
  
  if (mode === 'slider') {
    return (
      <div
        ref={containerRef}
        className={cn('relative overflow-hidden rounded-md cursor-col-resize', className)}
        onMouseMove={handleMouseMove}
      >
        <img
          src={before}
          alt="Before"
          className="w-full"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={after}
            alt="After"
            className="w-full"
            style={{ width: `${(100 / sliderPosition) * 100}%` }}
          />
        </div>
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 8L1 5M1 11L4 8M12 8L15 5M15 11L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    )
  }
  
  // Difference mode (placeholder - would need image processing)
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm text-muted-foreground">
        Difference visualization not yet implemented
      </p>
      <div className="grid grid-cols-2 gap-4">
        <img src={before} alt="Before" className="w-full rounded-md border" />
        <img src={after} alt="After" className="w-full rounded-md border" />
      </div>
    </div>
  )
} 