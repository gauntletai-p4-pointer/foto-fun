'use client'

import React from 'react'
import { ModelQualityToggleCompact } from '@/components/ui/ModelQualityToggle'
import type { ToolOption } from '@/lib/store/tools/EventToolStore'
import type { ModelTier } from '@/lib/plugins/types'

interface OptionModelQualityProps {
  option: ToolOption<string>
  onChange: (value: string) => void
}

export function OptionModelQuality({
  option,
  onChange
}: OptionModelQualityProps) {
  // Get tiers from option props or use defaults
  const tiers = (option.props?.tiers as Record<string, ModelTier>) || {
    best: {
      name: 'Best',
      description: 'Highest quality, slower processing',
      cost: 0.003,
      quality: 'exceptional' as const
    },
    balanced: {
      name: 'Balanced', 
      description: 'Good quality, moderate speed',
      cost: 0.001,
      quality: 'very-good' as const
    },
    fast: {
      name: 'Fast',
      description: 'Good quality, fastest processing', 
      cost: 0.0005,
      quality: 'good' as const
    }
  }

  const showCost = option.props?.showCost !== false

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-foreground whitespace-nowrap">
        {option.label}:
      </span>
      <ModelQualityToggleCompact
        tiers={tiers}
        value={option.value}
        onChange={onChange}
        showCost={showCost}
      />
    </div>
  )
}