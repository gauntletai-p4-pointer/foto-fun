'use client'

import { useState, useEffect } from 'react'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TextLayerStyles, type StrokeOptions } from '@/lib/editor/text/effects'
import { cn } from '@/lib/utils'

interface StrokeSectionProps {
  object: CanvasObject | null
  onChange: () => void
}

export function StrokeSection({ object, onChange }: StrokeSectionProps) {
  const [enabled, setEnabled] = useState(false)
  const [options, setOptions] = useState<StrokeOptions>({
    color: '#000000',
    width: 2,
    position: 'center',
  })
  
  // Type guard for text objects
  if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
    return null
  }
  
  // Check if object has stroke on mount
  useEffect(() => {
    if (object.stroke && object.strokeWidth) {
      setEnabled(true)
      setOptions({
        color: typeof object.stroke === 'string' ? object.stroke : '#000000',
        width: object.strokeWidth,
        position: object.paintFirst === 'stroke' ? 'outside' : 'center',
      })
    }
  }, [object])
  
  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    
    if (checked) {
      TextLayerStyles.applyStroke(object, options)
    } else {
      TextLayerStyles.removeStroke(object)
    }
    
    onChange()
  }
  
  const updateOption = <K extends keyof StrokeOptions>(
    key: K,
    value: StrokeOptions[K]
  ) => {
    const newOptions = { ...options, [key]: value }
    setOptions(newOptions)
    
    if (enabled) {
      TextLayerStyles.applyStroke(object, newOptions)
      onChange()
    }
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Stroke</label>
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
        
        {/* Width */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Width</label>
            <span className="text-xs text-foreground/60">
              {options.width}px
            </span>
          </div>
          <Slider
            value={[options.width]}
            onValueChange={([value]) => updateOption('width', value)}
            min={0}
            max={20}
            step={1}
            className="w-full"
          />
        </div>
        
        {/* Position */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Position</label>
          <ToggleGroup
            type="single"
            value={options.position}
            onValueChange={(value) => {
              if (value) updateOption('position', value as StrokeOptions['position'])
            }}
            className="justify-start"
          >
            <ToggleGroupItem value="outside" className="text-xs">
              Outside
            </ToggleGroupItem>
            <ToggleGroupItem value="center" className="text-xs">
              Center
            </ToggleGroupItem>
            <ToggleGroupItem value="inside" className="text-xs">
              Inside
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  )
} 