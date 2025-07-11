'use client'

import { Button } from '@/components/ui/button'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { useService } from '@/lib/core/AppInitializer'
import { TextLayerStyles } from '@/lib/editor/text/effects'
import Konva from 'konva'

interface TextPresetsSectionProps {
  object: CanvasObject | null
  onChange: () => void
}

export function TextPresetsSection({ object, onChange }: TextPresetsSectionProps) {
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  // Type guard for text objects
  if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
    return null
  }
  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'neon':
        // Neon effect
        TextLayerStyles.applyEffects(object, {
          stroke: {
            color: '#ffffff',
            width: 2,
            position: 'center',
          },
          glow: {
            type: 'outer',
            color: '#00ffff',
            size: 20,
            opacity: 0.8,
          },
        })
        break
        
      case 'shadow':
        // Classic drop shadow
        TextLayerStyles.applyEffects(object, {
          dropShadow: {
            color: '#000000',
            opacity: 0.5,
            angle: 45,
            distance: 5,
            blur: 5,
          },
        })
        break
        
      case 'outline':
        // Bold outline
        TextLayerStyles.applyEffects(object, {
          stroke: {
            color: '#000000',
            width: 4,
            position: 'outside',
          },
        })
        // Update fill color using CanvasManager
        if (canvasManager) {
          const node = canvasManager.getNode(object.id)
          if (node && node instanceof Konva.Text) {
            const textNode = node as Konva.Text
            textNode.fill('#ffffff')
            // Store in metadata
            object.metadata = {
              ...object.metadata,
              fill: '#ffffff'
            }
            // Force redraw
            const layer = textNode.getLayer()
            if (layer) {
              layer.batchDraw()
            }
          }
        }
        break
    }
    
    onChange()
  }
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Presets</h4>
      <div className="grid grid-cols-3 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => applyPreset('neon')}
        >
          Neon
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => applyPreset('shadow')}
        >
          Shadow
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => applyPreset('outline')}
        >
          Outline
        </Button>
      </div>
    </div>
  )
} 