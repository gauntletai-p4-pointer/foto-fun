'use client'

import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'

interface LineHeightControlProps {
  value: number
  onChange: (height: number) => void
}

export function LineHeightControl({ value, onChange }: LineHeightControlProps) {
  const handleSliderChange = (values: number[]) => {
    onChange(values[0])
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue) && newValue >= 0.5 && newValue <= 3) {
      onChange(newValue)
    }
  }
  
  // Convert to percentage for display
  const displayValue = Math.round(value * 100)
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">Line Height</label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={displayValue}
            onChange={(e) => {
              const percent = parseFloat(e.target.value)
              if (!isNaN(percent)) {
                const newEvent = {
                  target: { value: (percent / 100).toString() }
                } as React.ChangeEvent<HTMLInputElement>
                handleInputChange(newEvent)
              }
            }}
            className="h-6 w-16 text-xs text-center"
            step={10}
            min={50}
            max={300}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        min={0.5}
        max={3}
        step={0.1}
        className="w-full"
      />
    </div>
  )
} 