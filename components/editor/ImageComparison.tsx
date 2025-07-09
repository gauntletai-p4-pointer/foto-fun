'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Slider } from '@/components/ui/slider'
import type { ComparisonMode } from '@/lib/ai/agents/types'

interface ImageComparisonProps {
  before: string
  after: string
  mode: ComparisonMode
}

export function ImageComparison({ before, after, mode }: ImageComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // For base64 images, we need to handle them specially
  const isBase64 = (src: string) => src.startsWith('data:')
  
  if (mode === 'side-by-side') {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-center">Before</h4>
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {isBase64(before) ? (
              // For base64, we need to use unoptimized
              <Image
                src={before}
                alt="Before"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <Image
                src={before}
                alt="Before"
                fill
                className="object-contain"
              />
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-center">After</h4>
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {isBase64(after) ? (
              <Image
                src={after}
                alt="After"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <Image
                src={after}
                alt="After"
                fill
                className="object-contain"
              />
            )}
          </div>
        </div>
      </div>
    )
  }
  
  if (mode === 'overlay') {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden" ref={containerRef}>
          {isBase64(before) ? (
            <Image
              src={before}
              alt="Before"
              fill
              className="object-contain"
              unoptimized
            />
          ) : (
            <Image
              src={before}
              alt="Before"
              fill
              className="object-contain"
            />
          )}
          <div className="absolute inset-0" style={{ opacity: overlayOpacity / 100 }}>
            {isBase64(after) ? (
              <Image
                src={after}
                alt="After"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <Image
                src={after}
                alt="After"
                fill
                className="object-contain"
              />
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Overlay Opacity</label>
          <Slider
            value={[overlayOpacity]}
            onValueChange={([value]) => setOverlayOpacity(value)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>
    )
  }
  
  // Slider mode
  return (
    <div className="space-y-4">
      <div 
        className="relative aspect-video bg-muted rounded-lg overflow-hidden"
        ref={containerRef}
      >
        {/* Before image (full width) */}
        {isBase64(before) ? (
          <Image
            src={before}
            alt="Before"
            fill
            className="object-contain"
            unoptimized
          />
        ) : (
          <Image
            src={before}
            alt="Before"
            fill
            className="object-contain"
          />
        )}
        
        {/* After image (clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          {isBase64(after) ? (
            <Image
              src={after}
              alt="After"
              fill
              className="object-contain"
              unoptimized
            />
          ) : (
            <Image
              src={after}
              alt="After"
              fill
              className="object-contain"
            />
          )}
        </div>
        
        {/* Slider handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-background rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Comparison Position</label>
        <Slider
          value={[sliderPosition]}
          onValueChange={([value]) => setSliderPosition(value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  )
} 