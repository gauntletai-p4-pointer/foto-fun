'use client'

import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { RotateCcw } from 'lucide-react'
import type { ToolOption } from '@/store/toolOptionsStore'

interface OptionSliderProps {
  option: ToolOption<number>
  onChange: (value: number) => void
  defaultValue?: number
}

export function OptionSlider({ option, onChange, defaultValue = 0 }: OptionSliderProps) {
  const props = option.props || {}
  const min = (props.min as number | undefined) ?? 0
  const max = (props.max as number | undefined) ?? 100
  const step = (props.step as number | undefined) ?? 1
  const unit = (props.unit as string | undefined) ?? ''
  const showReset = option.value !== defaultValue
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value)) {
      // Clamp value between min and max
      const clampedValue = Math.max(min, Math.min(max, value))
      onChange(clampedValue)
    }
  }
  
  return (
    <div className="flex items-center gap-3 min-w-[300px]">
      <label className="text-sm font-medium text-foreground whitespace-nowrap">
        {option.label}:
      </label>
      <Slider
        value={[option.value]}
        onValueChange={([value]) => onChange(value)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={option.value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          className="w-16 h-7 text-xs px-2 text-center"
        />
        <span className="text-sm text-foreground/60">
          {unit}
        </span>
      </div>
      {showReset && (
        <button
          onClick={() => onChange(defaultValue)}
          className="p-1 hover:bg-primary/10 rounded-md transition-colors"
          title="Reset to default"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  )
} 