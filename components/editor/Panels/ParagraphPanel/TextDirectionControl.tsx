'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Label } from '@/components/ui/label'
import { ArrowRight, ArrowLeft } from 'lucide-react'

interface TextDirectionControlProps {
  value: 'ltr' | 'rtl'
  onChange: (value: 'ltr' | 'rtl') => void
}

export function TextDirectionControl({ value, onChange }: TextDirectionControlProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Text Direction</Label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(newValue) => {
          if (newValue) onChange(newValue as 'ltr' | 'rtl')
        }}
        className="justify-start"
      >
        <ToggleGroupItem value="ltr" aria-label="Left to right">
          <div className="flex items-center gap-1">
            <span className="text-xs">LTR</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </ToggleGroupItem>
        <ToggleGroupItem value="rtl" aria-label="Right to left">
          <div className="flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            <span className="text-xs">RTL</span>
          </div>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
} 