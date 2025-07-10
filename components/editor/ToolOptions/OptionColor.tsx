'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ToolOption } from '@/lib/store/tools/EventToolStore'
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventColorStore } from '@/lib/store/color/EventColorStore'

interface OptionColorProps {
  option: ToolOption<string>
  onChange: (value: string) => void
}

export function OptionColor({ option, onChange }: OptionColorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempColor, setTempColor] = useState(option.value)
  const colorStore = useService<EventColorStore>('ColorStore')
  const colorState = useStore(colorStore)
  const recentColors = colorState.recentColors
  const addRecentColor = (color: string) => colorStore.addRecentColor(color)
  
  const handleColorChange = (color: string) => {
    setTempColor(color)
    onChange(color)
    addRecentColor(color)
    setIsOpen(false)
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTempColor(value)
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onChange(value)
    }
  }
  
  const presetColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#C0C0C0'
  ]
  
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-foreground whitespace-nowrap">
        {option.label}:
      </label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-8 px-2 flex items-center gap-2"
          >
            <div 
              className="w-5 h-5 rounded border border-foreground/10"
              style={{ backgroundColor: option.value }}
            />
            <span className="text-xs font-mono text-foreground">{option.value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-3">
            {/* Hex input */}
            <div className="space-y-1">
              <label className="text-xs text-foreground/60">Hex Color</label>
              <Input
                value={tempColor}
                onChange={handleInputChange}
                className="h-8 font-mono text-xs"
                placeholder="#000000"
              />
            </div>
            
            {/* Recent colors */}
            {recentColors.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-foreground/60">Recent</label>
                <div className="grid grid-cols-8 gap-1">
                  {recentColors.slice(0, 8).map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      className="w-6 h-6 rounded border border-foreground/10 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(color)}
                      aria-label={`Select recent color ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Preset colors */}
            <div className="space-y-1">
              <label className="text-xs text-foreground/60">Presets</label>
              <div className="grid grid-cols-5 gap-1">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded border border-foreground/10 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
            
            {/* Native color picker */}
            <div className="pt-2 border-t">
              <input
                type="color"
                value={option.value}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-full h-8 cursor-pointer rounded"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 