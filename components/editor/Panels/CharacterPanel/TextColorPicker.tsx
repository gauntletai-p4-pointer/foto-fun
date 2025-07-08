'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Palette } from 'lucide-react'

interface TextColorPickerProps {
  value: string
  onChange: (color: string) => void
}

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#C0C0C0',
  '#800000', '#008000', '#000080', '#808000', '#800080',
  '#008080', '#FFA500', '#A52A2A', '#8B4513', '#2F4F4F'
]

export function TextColorPicker({ value, onChange }: TextColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  
  const handleColorChange = (color: string) => {
    setInputValue(color)
    onChange(color)
    setOpen(false)
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue)
    }
  }
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground">Color</label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-10 h-8 p-0 border-2"
              style={{ backgroundColor: value }}
            >
              <span className="sr-only">Pick a color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <Button
                  key={color}
                  variant="outline"
                  className="w-8 h-8 p-0 border-2"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                >
                  <span className="sr-only">{color}</span>
                </Button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="#000000"
                className="h-8"
              />
            </div>
          </PopoverContent>
        </Popover>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className="h-8 flex-1"
        />
      </div>
    </div>
  )
} 