'use client'

import { useEffect, useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { TypedCanvasStore, useCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { Sparkles } from 'lucide-react'
import { DropShadowSection } from './DropShadowSection'
import { StrokeSection } from './StrokeSection'
import { GlowSection } from './GlowSection'
import { GradientSection } from './GradientSection'
import { TextPresetsSection } from './TextPresetsSection'
import { TextWarpSection } from './TextWarpSection'
import { Button } from '@/components/ui/button'

/**
 * Text Effects Panel - Advanced text effects like drop shadow, stroke, glow, etc.
 * Shows when a text object is selected
 */
export function TextEffectsPanel() {
  const canvasStore = useService<TypedCanvasStore>('CanvasStore')
  const canvasState = useCanvasStore(canvasStore)
  const [activeTextObject, setActiveTextObject] = useState<any | null>(null)
  
  useEffect(() => {
    // Check if we have a text object selected
    const selectedObjects = canvasStore.getSelectedObjects()
    const textObject = selectedObjects.find(obj => obj.type === 'text')
    setActiveTextObject(textObject || null)
  }, [canvasState.selection, canvasStore])
  
  if (!activeTextObject) {
    return (
      <div className="p-4 text-center text-foreground/60">
        <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Select text to add effects</p>
      </div>
    )
  }
  
  const handleEffectChange = () => {
    // TODO: Update this to work with the new canvas system
    console.log('Effect changed for text object:', activeTextObject)
  }
  
  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <h3 className="font-semibold text-sm text-foreground">Text Effects</h3>
      
      {/* Text Presets */}
      <TextPresetsSection 
        object={activeTextObject}
        onChange={handleEffectChange}
      />
      
      {/* Drop Shadow */}
      <DropShadowSection 
        object={activeTextObject}
        onChange={handleEffectChange}
      />
      
      {/* Stroke */}
      <StrokeSection 
        object={activeTextObject}
        onChange={handleEffectChange}
      />
      
      {/* Glow */}
      <GlowSection 
        object={activeTextObject}
        onChange={handleEffectChange}
      />
      
      {/* Gradient Fill */}
      <GradientSection 
        object={activeTextObject}
        onChange={handleEffectChange}
      />
      
      {/* Text Warp */}
      <TextWarpSection 
        object={activeTextObject}
      />
      
      {/* Clear All Effects */}
      <div className="pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => {
            // TODO: Clear all effects from the text in the new system
            console.log('Clear all effects for:', activeTextObject)
            handleEffectChange()
          }}
        >
          Clear All Effects
        </Button>
      </div>
    </div>
  )
} 