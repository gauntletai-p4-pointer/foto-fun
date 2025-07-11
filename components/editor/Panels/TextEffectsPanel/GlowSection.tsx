'use client'

import { useState, useEffect } from 'react'
import Konva from 'konva'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { useService } from '@/lib/core/AppInitializer'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface GlowOptions {
  color: string
  blur: number
  opacity: number
  inner: boolean
}

interface GlowSectionProps {
  object: CanvasObject | null
  onChange: () => void
}

export function GlowSection({ object, onChange }: GlowSectionProps) {
  const canvasManager = useService<CanvasManager>('CanvasManager')
  const [enabled, setEnabled] = useState(false)
  const [options, setOptions] = useState<GlowOptions>({
    color: '#ffffff',
    blur: 10,
    opacity: 0.8,
    inner: false,
  })
  
  // Check if object has glow effect on mount
  useEffect(() => {
    // Type guard inside useEffect
    if (!object || (object.type !== 'text' && object.type !== 'verticalText') || !canvasManager) {
      return
    }
    
    const node = canvasManager.getNode(object.id)
    if (!node || !(node instanceof Konva.Text)) return
    
    const textNode = node as Konva.Text
    // Check for existing glow effect (using shadow properties for glow)
    const shadowColor = textNode.shadowColor()
    const shadowBlur = textNode.shadowBlur()
    
    if (shadowColor && shadowBlur > 5) { // Assume high blur = glow effect
      setEnabled(true)
      setOptions({
        color: shadowColor,
        blur: shadowBlur,
        opacity: textNode.shadowOpacity() || 0.8,
        inner: false, // Konva doesn't have inner glow, so default to false
      })
    }
  }, [object, canvasManager])
  
  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    
    if (checked) {
      applyGlow(options)
    } else {
      removeGlow()
    }
    
    onChange()
  }
  
  const applyGlow = (glowOptions: GlowOptions) => {
    if (!object || !canvasManager) return
    
    const node = canvasManager.getNode(object.id)
    if (!node || !(node instanceof Konva.Text)) return
    
    const textNode = node as Konva.Text
    
    // Apply glow effect using Konva shadow properties
    textNode.shadowColor(glowOptions.color)
    textNode.shadowBlur(glowOptions.blur)
    textNode.shadowOpacity(glowOptions.opacity)
    textNode.shadowOffsetX(0) // No offset for glow
    textNode.shadowOffsetY(0)
    
    // Redraw the layer
    const layer = textNode.getLayer()
    if (layer) layer.batchDraw()
  }
  
  const removeGlow = () => {
    if (!object || !canvasManager) return
    
    const node = canvasManager.getNode(object.id)
    if (!node || !(node instanceof Konva.Text)) return
    
    const textNode = node as Konva.Text
    
    textNode.shadowColor('')
    textNode.shadowBlur(0)
    textNode.shadowOpacity(0)
    textNode.shadowOffsetX(0)
    textNode.shadowOffsetY(0)
    
    // Redraw the layer
    const layer = textNode.getLayer()
    if (layer) layer.batchDraw()
  }
  
  const updateOption = <K extends keyof GlowOptions>(
    key: K,
    value: GlowOptions[K]
  ) => {
    const newOptions = { ...options, [key]: value }
    setOptions(newOptions)
    
    if (enabled) {
      applyGlow(newOptions)
      onChange()
    }
  }
  
  // Type guard for text objects
  if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
    return null
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Glow</label>
        <Checkbox
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>
      
      <div className={cn("space-y-3", !enabled && "opacity-50 pointer-events-none")}>
        {/* Color */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium w-16 text-foreground">Color:</label>
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="color"
              value={options.color}
              onChange={(e) => updateOption('color', e.target.value)}
              className="h-8 w-16"
            />
            <span className="text-xs text-foreground/60">
              {options.color}
            </span>
          </div>
        </div>
        
        {/* Blur */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Blur</label>
            <span className="text-xs text-foreground/60">
              {options.blur}px
            </span>
          </div>
          <Slider
            value={[options.blur]}
            onValueChange={([value]) => updateOption('blur', value)}
            min={0}
            max={50}
            step={1}
            className="w-full"
          />
        </div>
        
        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Opacity</label>
            <span className="text-xs text-foreground/60">
              {Math.round(options.opacity * 100)}%
            </span>
          </div>
          <Slider
            value={[options.opacity]}
            onValueChange={([value]) => updateOption('opacity', value)}
            min={0}
            max={1}
            step={0.01}
            className="w-full"
          />
        </div>
        
        {/* Inner Glow (Note: Not supported in Konva) */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={options.inner}
                         onCheckedChange={(checked) => updateOption('inner', !!checked)}
            disabled={true} // Disabled because Konva doesn't support inner glow
          />
          <label className="text-xs font-medium text-foreground/50">
            Inner Glow (Not supported)
          </label>
        </div>
      </div>
    </div>
  )
} 