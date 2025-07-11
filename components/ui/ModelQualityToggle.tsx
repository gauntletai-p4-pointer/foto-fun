'use client'

import React from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import { Zap, Sparkles, Gauge } from 'lucide-react'
import type { ModelTier } from '@/lib/plugins/types'

interface ModelQualityToggleProps {
  tiers: Record<string, ModelTier>
  value: string
  onChange: (value: string) => void
  showCost?: boolean
  className?: string
}

export function ModelQualityToggle({
  tiers,
  value,
  onChange,
  showCost = true,
  className
}: ModelQualityToggleProps) {
  const getIcon = (tierId: string) => {
    switch (tierId) {
      case 'best':
        return <Sparkles className="w-4 h-4" />
      case 'fast':
        return <Zap className="w-4 h-4" />
      default:
        return <Gauge className="w-4 h-4" />
    }
  }
  
  const getQualityColor = (quality: ModelTier['quality']) => {
    switch (quality) {
      case 'exceptional':
        return 'text-primary'
      case 'very-good':
        return 'text-foreground'
      case 'good':
        return 'text-muted-foreground'
      default:
        return 'text-muted-foreground'
    }
  }
  
  return (
    <div className={className}>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onChange}
        className="justify-start"
      >
        {Object.entries(tiers).map(([tierId, tier]) => (
          <ToggleGroupItem
            key={tierId}
            value={tierId}
            className="flex items-center gap-2"
            title={tier.description}
          >
            {getIcon(tierId)}
            <span className="text-sm font-medium">{tier.name}</span>
            {showCost && (
              <Badge variant="secondary" className="text-xs">
                ${tier.cost.toFixed(4)}
              </Badge>
            )}
            <span className={`text-xs ${getQualityColor(tier.quality)}`}>
              {tier.quality}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

/**
 * Compact version for tool options
 */
export function ModelQualityToggleCompact({
  tiers,
  value,
  onChange,
  showCost = false
}: ModelQualityToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Quality:</span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onChange}
        className="h-8"
      >
        {Object.entries(tiers).map(([tierId, tier]) => (
          <ToggleGroupItem
            key={tierId}
            value={tierId}
            className="h-8 px-2 text-xs"
            title={`${tier.name} - ${tier.description}${showCost ? ` ($${tier.cost})` : ''}`}
          >
            {tierId === 'best' ? '✨' : tierId === 'fast' ? '⚡' : '⚖️'}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {showCost && tiers[value] && (
        <span className="text-xs text-muted-foreground">
          ~${tiers[value].cost.toFixed(3)}
        </span>
      )}
    </div>
  )
} 