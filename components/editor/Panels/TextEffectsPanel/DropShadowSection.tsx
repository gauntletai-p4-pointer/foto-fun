'use client'

import { useState, useEffect } from 'react'
import { IText, Textbox, Shadow } from 'fabric'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { TextLayerStyles, type DropShadowOptions } from '@/lib/editor/text/effects'
import { cn } from '@/lib/utils'

interface DropShadowSectionProps {
  object: IText | Textbox
  onChange: () => void
}

export function DropShadowSection({ object, onChange }: DropShadowSectionProps) {
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
    if (object.shadow) {
      setEnabled(true)
      // Try to extract shadow properties
      const shadow = object.shadow as Shadow
      if (shadow) {
        setOptions({
          color: shadow.color || '#000000',
          opacity: 0.5, // Fabric doesn't store opacity separately
          angle: Math.atan2(shadow.offsetY || 0, shadow.offsetX || 0) * 180 / Math.PI,
          distance: Math.sqrt((shadow.offsetX || 0) ** 2 + (shadow.offsetY || 0) ** 2),
          blur: shadow.blur || 5,
        })
      }
    }
  }, [object])
  
  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    
    if (checked) {
      TextLayerStyles.applyDropShadow(object, options)
    } else {
      TextLayerStyles.removeDropShadow(object)
    }
    
    onChange()
  }
  
  const updateOption = <K extends keyof DropShadowOptions>(
    key: K,
    value: DropShadowOptions[K]
  ) => {
    const newOptions = { ...options, [key]: value }
    setOptions(newOptions)
    
    if (enabled) {
      TextLayerStyles.applyDropShadow(object, newOptions)
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
  
  // Update shadow color with opacity
  const updateColorWithOpacity = () => {
    if (enabled) {
      const colorWithOpacity = getColorWithOpacity(options.color, options.opacity)
      TextLayerStyles.applyDropShadow(object, {
        ...options,
        color: colorWithOpacity,
      })
      onChange()
    }
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