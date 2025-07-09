'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Alternative } from '@/lib/ai/agents/types'
import { Check } from 'lucide-react'

interface AlternativeGridProps {
  alternatives: Alternative[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export function AlternativeGrid({ 
  alternatives, 
  selectedIndex, 
  onSelect 
}: AlternativeGridProps) {
  // Check if image is base64
  const isBase64 = (src: string | undefined) => src?.startsWith('data:')
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {alternatives.map((alt, index) => (
        <button
          key={alt.id}
          onClick={() => onSelect(index)}
          className={cn(
            "relative rounded-lg overflow-hidden border-2 transition-all",
            selectedIndex === index 
              ? "border-primary ring-2 ring-primary ring-offset-2" 
              : "border-muted hover:border-muted-foreground"
          )}
        >
          {alt.preview?.after && (
            <div className="relative aspect-video bg-muted">
              {isBase64(alt.preview.after) ? (
                <Image
                  src={alt.preview.after}
                  alt={alt.description}
                  fill
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Image
                  src={alt.preview.after}
                  alt={alt.description}
                  fill
                  className="object-contain"
                />
              )}
            </div>
          )}
          
          <div className="p-2 bg-background">
            <p className="text-xs text-left">{alt.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(alt.confidence * 100)}% confidence
            </p>
          </div>
          
          {selectedIndex === index && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </button>
      ))}
    </div>
  )
} 