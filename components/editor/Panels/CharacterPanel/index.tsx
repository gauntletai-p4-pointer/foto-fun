'use client'

import { useEffect, useState } from 'react'
import { IText, Textbox } from 'fabric'
import { useCanvasStore } from '@/store/canvasStore'
import { FontSelector } from './FontSelector'
import { FontSizeInput } from './FontSizeInput'
import { FontStyleButtons } from './FontStyleButtons'
import { TextColorPicker } from './TextColorPicker'
import { LetterSpacingControl } from './LetterSpacingControl'
import { LineHeightControl } from './LineHeightControl'
import { Button } from '@/components/ui/button'
import { Type } from 'lucide-react'

/**
 * Character Panel - Advanced text formatting controls
 * Shows when a text object is selected
 */
export function CharacterPanel() {
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
    
    return () => {
      fabricCanvas.off('selection:created', handleSelection)
      fabricCanvas.off('selection:updated', handleSelection)
      fabricCanvas.off('selection:cleared')
    }
  }, [fabricCanvas])
  
  if (!activeTextObject) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Type className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Select text to see character options</p>
      </div>
    )
  }
  
  const updateTextProperty = <K extends keyof IText>(property: K, value: IText[K]) => {
    if (!activeTextObject || !fabricCanvas) return
    
    activeTextObject.set(property, value)
    fabricCanvas.renderAll()
    
    // Fire modified event for history tracking
    fabricCanvas.fire('object:modified', { target: activeTextObject })
  }
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm">Character</h3>
      
      {/* Font Family */}
      <FontSelector 
        value={activeTextObject.fontFamily || 'Arial'} 
        onChange={(font) => updateTextProperty('fontFamily', font)}
      />
      
      {/* Font Size */}
      <FontSizeInput 
        value={activeTextObject.fontSize || 24}
        onChange={(size) => updateTextProperty('fontSize', size)}
      />
      
      {/* Font Style Buttons */}
      <FontStyleButtons 
        object={activeTextObject}
        onChange={updateTextProperty}
      />
      
      {/* Text Color */}
      <TextColorPicker 
        value={activeTextObject.fill as string || '#000000'}
        onChange={(color) => updateTextProperty('fill', color)}
      />
      
      {/* Letter Spacing */}
      <LetterSpacingControl 
        value={activeTextObject.charSpacing || 0}
        onChange={(spacing) => updateTextProperty('charSpacing', spacing)}
      />
      
      {/* Line Height */}
      <LineHeightControl 
        value={activeTextObject.lineHeight || 1.16}
        onChange={(height) => updateTextProperty('lineHeight', height)}
      />
      
      {/* Advanced Options */}
      <div className="pt-2 border-t">
        <Button variant="outline" size="sm" className="w-full">
          More Options...
        </Button>
      </div>
    </div>
  )
} 