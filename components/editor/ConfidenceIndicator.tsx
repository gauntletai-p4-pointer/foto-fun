'use client'

import { cn } from '@/lib/utils'

interface ConfidenceIndicatorProps {
  confidence: number
  className?: string
}

export function ConfidenceIndicator({ confidence, className }: ConfidenceIndicatorProps) {
  const percentage = Math.round(confidence * 100)
  
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }
  
  const getLabel = () => {
    if (confidence >= 0.8) return 'High Confidence'
    if (confidence >= 0.6) return 'Medium Confidence'
    return 'Low Confidence'
  }
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{getLabel()}</span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300', getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
} 