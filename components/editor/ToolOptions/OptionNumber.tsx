'use client'

import { Input } from '@/components/ui/input'
import type { ToolOption } from '@/store/toolOptionsStore'

interface OptionNumberProps {
  option: ToolOption<number>
  onChange: (value: number) => void
}

export function OptionNumber({ option, onChange }: OptionNumberProps) {
  const { min, max, step, unit } = option.props || {}
  
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-foreground whitespace-nowrap">
        {option.label}:
      </label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={option.value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-20 h-8 text-foreground"
        />
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
    </div>
  )
} 