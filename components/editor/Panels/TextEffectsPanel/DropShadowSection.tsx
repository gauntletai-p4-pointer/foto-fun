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

interface DropShadowOptions {
  color: string
  opacity: number
  angle: number
  distance: number
  blur: number
}

interface DropShadowSectionProps {
  object: CanvasObject | null
  onChange: () => void
}

export function DropShadowSection({ object, onChange }: DropShadowSectionProps) {
  const canvasManager = useService<CanvasManager>('CanvasManager')
  const [enabled, setEnabled] = useState(false)
  const [options, setOptions] = useState<DropShadowOptions>({
    color: '#000000',
    opacity: 0.5,
    angle: 45,
    distance: 5,
    blur: 5,
  })
  
  // Check if object has shadow on mount
  useEffect(() => {
    // Type guard inside useEffect
    if (!object || (object.type !== 'text' && object.type !== 'verticalText') || !canvasManager) {
      return
    }
    
    const node = canvasManager.getNode(object.id)
    if (!node || !(node instanceof Konva.Text)) return
    
    const textNode = node as Konva.Text
    // Check for Konva shadow properties
    const shadowColor = textNode.shadowColor()
    const shadowBlur = textNode.shadowBlur()
    const shadowOffsetX = textNode.shadowOffsetX()
    const shadowOffsetY = textNode.shadowOffsetY()
    
    if (shadowColor || shadowBlur || shadowOffsetX || shadowOffsetY) {
      setEnabled(true)
      setOptions({
        color: shadowColor || '#000000',
        opacity: textNode.shadowOpacity() || 0.5,
        angle: Math.atan2(shadowOffsetY || 0, shadowOffsetX || 0) * 180 / Math.PI,
        distance: Math.sqrt((shadowOffsetX || 0) ** 2 + (shadowOffsetY || 0) ** 2),
        blur: shadowBlur || 5,
      })
    }
  }, [object, canvasManager])
  
  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    
    if (checked) {
      applyDropShadow(options)
    } else {
      removeDropShadow()
    }
    
    onChange()
  }
  
  const applyDropShadow = (shadowOptions: DropShadowOptions) => {
    if (!object || !canvasManager) return
    
    const node = canvasManager.getNode(object.id)
    if (!node || !(node instanceof Konva.Text)) return
    
    const textNode = node as Konva.Text
    
    // Calculate offset from angle and distance
    const radians = shadowOptions.angle * Math.PI / 180
    const offsetX = Math.cos(radians) * shadowOptions.distance
    const offsetY = Math.sin(radians) * shadowOptions.distance
    
    // Apply Konva shadow properties
    textNode.shadowColor(shadowOptions.color)
    textNode.shadowOpacity(shadowOptions.opacity)
    textNode.shadowOffsetX(offsetX)
    textNode.shadowOffsetY(offsetY)
    textNode.shadowBlur(shadowOptions.blur)
    
    // Redraw the layer
    const layer = textNode.getLayer()
    if (layer) layer.batchDraw()
  }
  
  const removeDropShadow = () => {
    if (!object || !canvasManager) return
    
    const node = canvasManager.getNode(object.id)
    if (!node || !(node instanceof Konva.Text)) return
    
    const textNode = node as Konva.Text
    
    textNode.shadowColor('')
    textNode.shadowOpacity(0)
    textNode.shadowOffsetX(0)
    textNode.shadowOffsetY(0)
    textNode.shadowBlur(0)
    
    // Redraw the layer
    const layer = textNode.getLayer()
    if (layer) layer.batchDraw()
  }
  
  const updateOption = <K extends keyof DropShadowOptions>(
    key: K,
    value: DropShadowOptions[K]
  ) => {
    const newOptions = { ...options, [key]: value }
    setOptions(newOptions)
    
    if (enabled) {
      applyDropShadow(newOptions)
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
        <label className="text-sm font-medium text-foreground">Drop Shadow</label>
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
        
        {/* Angle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Angle</label>
            <span className="text-xs text-foreground/60">
              {options.angle}°
            </span>
          </div>
          <Slider
            value={[options.angle]}
            onValueChange={([value]) => updateOption('angle', value)}
            min={0}
            max={360}
            step={1}
            className="w-full"
          />
        </div>
        
        {/* Distance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Distance</label>
            <span className="text-xs text-foreground/60">
              {options.distance}px
            </span>
          </div>
          <Slider
            value={[options.distance]}
            onValueChange={([value]) => updateOption('distance', value)}
            min={0}
            max={50}
            step={1}
            className="w-full"
          />
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
      </div>
    </div>
  )
} 