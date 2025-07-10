'use client'

import { Button } from '@/components/ui/button'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { TextLayerStyles } from '@/lib/editor/text/effects'

interface GradientSectionProps {
  object: CanvasObject | null
  onChange: () => void
}

export function GradientSection({ object, onChange }: GradientSectionProps) {
  // Type guard for text objects
  if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
    return null
  }
  
  const applyGradient = () => {
    // Apply a simple gradient
    TextLayerStyles.applyGradientFill(object, {
      type: 'linear',
      angle: 90,
      colorStops: [
        { offset: 0, color: '#ff0000' },
        { offset: 0.5, color: '#ffff00' },
        { offset: 1, color: '#00ff00' },
      ],
    })
    onChange()
  }
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Gradient Fill</h4>
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={applyGradient}
      >
        Apply Rainbow Gradient
      </Button>
    </div>
  )
} 