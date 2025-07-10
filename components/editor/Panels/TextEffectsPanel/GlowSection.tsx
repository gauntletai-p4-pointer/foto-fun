'use client'

import { useState, useEffect } from 'react'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TextLayerStyles, type GlowOptions } from '@/lib/editor/text/effects'
import { cn } from '@/lib/utils'

// Local interface for Shadow properties
interface Shadow {
  color?: string
  offsetX?: number
  offsetY?: number
  blur?: number
}

interface GlowSectionProps {
  object: CanvasObject | null
  onChange: () => void
}

export function GlowSection({ object, onChange }: GlowSectionProps) {
  const [enabled, setEnabled] = useState(false)
  const [options, setOptions] = useState<GlowOptions>({
    type: 'outer',
    color: '#ffffff',
    size: 10,
    opacity: 0.8,
  })
  
  // Type guard for text objects
  if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
    return null
  }
  
  // Check if object has glow on mount
  useEffect(() => {
    // Check for outer glow (shadow with 0 offset)
    if (object.shadow) {
      const shadow = object.shadow as Shadow
      if (shadow.offsetX === 0 && shadow.offsetY === 0) {
        setEnabled(true)
        setOptions({
          type: 'outer',
          color: shadow.color || '#ffffff',
          size: shadow.blur || 10,
          opacity: 0.8,
        })
      }
    }
    
    // Check for inner glow (custom property)
    const textWithGlow = object as CanvasObject & { innerGlow?: { color: string; size: number; opacity: number } }
    if (textWithGlow.innerGlow) {
      setEnabled(true)
      const glow = textWithGlow.innerGlow
      setOptions({
        type: 'inner',
        color: glow.color,
        size: glow.size,
        opacity: glow.opacity,
      })
    }
  }, [object])
  
  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    
    if (checked) {
      TextLayerStyles.applyGlow(object, options)
    } else {
      TextLayerStyles.removeGlow(object)
    }
    
    onChange()
  }
  
  const updateOption = <K extends keyof GlowOptions>(
    key: K,
    value: GlowOptions[K]
  ) => {
    const newOptions = { ...options, [key]: value }
    setOptions(newOptions)
    
    if (enabled) {
      // If changing type, remove existing glow first
      if (key === 'type') {
        TextLayerStyles.removeGlow(object)
      }
      
      TextLayerStyles.applyGlow(object, newOptions)
      onChange()
    }
  }
  
  // Convert hex color to rgba with opacity
  const getColorWithOpacity = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  
  // Update glow color with opacity
  const updateColorWithOpacity = () => {
    if (enabled) {
      const colorWithOpacity = getColorWithOpacity(options.color, options.opacity)
      TextLayerStyles.applyGlow(object, {
        ...options,
        color: colorWithOpacity,
      })
      onChange()
    }
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
        {/* Type */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Type</label>
          <ToggleGroup
            type="single"
            value={options.type}
            onValueChange={(value) => {
              if (value) updateOption('type', value as GlowOptions['type'])
            }}
            className="justify-start"
          >
            <ToggleGroupItem value="outer" className="text-xs">
              Outer
            </ToggleGroupItem>
            <ToggleGroupItem value="inner" className="text-xs">
              Inner
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Color */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium w-16 text-foreground">Color:</label>
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="color"
              value={options.color}
              onChange={(e) => {
                updateOption('color', e.target.value)
                updateColorWithOpacity()
              }}
              className="h-8 w-16"
            />
            <span className="text-xs text-foreground/60">
              {options.color}
            </span>
          </div>
        </div>
        
        {/* Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Size</label>
            <span className="text-xs text-foreground/60">
              {options.size}px
            </span>
          </div>
          <Slider
            value={[options.size]}
            onValueChange={([value]) => updateOption('size', value)}
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
            onValueChange={([value]) => {
              updateOption('opacity', value)
              updateColorWithOpacity()
            }}
            min={0}
            max={1}
            step={0.01}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
} 