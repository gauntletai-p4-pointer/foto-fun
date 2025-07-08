'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface FontSizeInputProps {
  value: number
  onChange: (size: number) => void
}

export function FontSizeInput({ value, onChange }: FontSizeInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue) && newValue >= 8 && newValue <= 144) {
      onChange(newValue)
    }
  }
  
  const increment = () => {
    const newValue = Math.min(144, value + 1)
    onChange(newValue)
  }
  
  const decrement = () => {
    const newValue = Math.max(8, value - 1)
    onChange(newValue)
  }
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground">Size</label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={8}
          max={144}
          step={1}
          className="h-8 w-20 text-center"
        />
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={increment}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={decrement}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground ml-1">pt</span>
      </div>
    </div>
  )
} 