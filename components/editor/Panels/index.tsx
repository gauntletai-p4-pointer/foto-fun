'use client'

import { useEffect, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Layers, Type, Sparkles, Hash } from 'lucide-react'
import { LayersPanel } from './LayersPanel'
import { CharacterPanel } from './CharacterPanel'
import { ParagraphPanel } from './ParagraphPanel'
import { TextEffectsPanel } from './TextEffectsPanel'
import { GlyphsPanel } from './GlyphsPanel'
import { AIChat } from './AIChat'
import { useCanvasStore } from '@/store/canvasStore'
import { IText, Textbox } from 'fabric'

export function Panels() {
  const [activePanel, setActivePanel] = useState<string>('layers')
  const { fabricCanvas } = useCanvasStore()
  const [hasTextSelected, setHasTextSelected] = useState(false)
  
  useEffect(() => {
    if (!fabricCanvas) return
    
    const checkSelection = () => {
      const activeObject = fabricCanvas.getActiveObject()
      const isText = activeObject && (activeObject instanceof IText || activeObject instanceof Textbox)
      setHasTextSelected(!!isText)
    }
    
    // Initial check
    checkSelection()
    
    // Listen for selection changes
    fabricCanvas.on('selection:created', checkSelection)
    fabricCanvas.on('selection:updated', checkSelection)
    fabricCanvas.on('selection:cleared', checkSelection)
    
    return () => {
      fabricCanvas.off('selection:created', checkSelection)
      fabricCanvas.off('selection:updated', checkSelection)
      fabricCanvas.off('selection:cleared', checkSelection)
    }
  }, [fabricCanvas])
  
  return (
    <div className="w-64 bg-background border-l border-border flex flex-col h-full">
      <div className="p-2 border-b border-border">
        <ToggleGroup type="single" value={activePanel} onValueChange={setActivePanel} className="w-full">
          <ToggleGroupItem value="layers" className="flex-1">
            <Layers className="h-4 w-4 mr-1" />
            Layers
          </ToggleGroupItem>
          {hasTextSelected && (
            <>
              <ToggleGroupItem value="character" className="flex-1">
                <Type className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="paragraph" className="flex-1">
                ¶
              </ToggleGroupItem>
              <ToggleGroupItem value="glyphs" className="flex-1">
                <Hash className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="effects" className="flex-1">
                <Sparkles className="h-4 w-4" />
              </ToggleGroupItem>
            </>
          )}
        </ToggleGroup>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {activePanel === 'layers' && <LayersPanel />}
        {activePanel === 'character' && hasTextSelected && <CharacterPanel />}
        {activePanel === 'paragraph' && hasTextSelected && <ParagraphPanel />}
        {activePanel === 'glyphs' && hasTextSelected && <GlyphsPanel />}
        {activePanel === 'effects' && hasTextSelected && <TextEffectsPanel />}
        {activePanel === 'ai' && <AIChat />}
      </div>
    </div>
  )
} 