'use client'

import { useEffect, useState } from 'react'
import { IText, Textbox } from 'fabric'
import { useCanvasStore } from '@/store/canvasStore'
import { Sparkles } from 'lucide-react'
import { DropShadowSection } from './DropShadowSection'
import { StrokeSection } from './StrokeSection'
import { GlowSection } from './GlowSection'
import { GradientSection } from './GradientSection'
import { TextPresetsSection } from './TextPresetsSection'
import { Button } from '@/components/ui/button'
import { TextLayerStyles } from '@/lib/editor/text/effects'

/**
 * Text Effects Panel - Advanced text effects like drop shadow, stroke, glow, etc.
 * Shows when a text object is selected
 */
export function TextEffectsPanel() {
  const { fabricCanvas } = useCanvasStore()
  const [activeTextObject, setActiveTextObject] = useState<IText | Textbox | null>(null)
  
  useEffect(() => {
    if (!fabricCanvas) return
    
    const handleSelection = () => {
      const activeObject = fabricCanvas.getActiveObject()
      if (activeObject && (activeObject instanceof IText || activeObject instanceof Textbox)) {
        setActiveTextObject(activeObject)
      } else {
        setActiveTextObject(null)
      }
    }
    
    // Initial check
    handleSelection()
    
    // Listen for selection changes
    fabricCanvas.on('selection:created', handleSelection)
    fabricCanvas.on('selection:updated', handleSelection)
    fabricCanvas.on('selection:cleared', () => setActiveTextObject(null))
    
    // Listen for object modifications to update UI
    fabricCanvas.on('object:modified', handleSelection)
    
    return () => {
      fabricCanvas.off('selection:created', handleSelection)
      fabricCanvas.off('selection:updated', handleSelection)
      fabricCanvas.off('selection:cleared')
      fabricCanvas.off('object:modified', handleSelection)
    }
  }, [fabricCanvas])
  
  if (!activeTextObject) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Select text to add effects</p>
      </div>
    )
  }
  
  const handleEffectChange = () => {
    if (!fabricCanvas) return
    
    // Trigger canvas update
    fabricCanvas.renderAll()
    
    // Fire modified event for history tracking
    fabricCanvas.fire('object:modified', { target: activeTextObject })
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
      
      {/* Clear All Effects */}
      <div className="pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => {
            // Clear all effects from the text
            TextLayerStyles.removeAllEffects(activeTextObject)
            handleEffectChange()
          }}
        >
          Clear All Effects
        </Button>
      </div>
    </div>
  )
} 