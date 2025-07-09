'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Alternative } from '@/lib/ai/agents/types'

interface AlternativeGridProps {
  alternatives: Alternative[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export function AlternativeGrid({
  alternatives,
  selectedIndex,
  onSelect
}: AlternativeGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {alternatives.map((alt, index) => (
        <Card
          key={alt.id}
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            selectedIndex === index && 'ring-2 ring-primary'
          )}
          onClick={() => onSelect(index)}
        >
          <div className="p-3 space-y-2">
            {alt.preview && (
              <img
                src={alt.preview.after}
                alt={alt.description}
                className="w-full h-32 object-cover rounded"
              />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium line-clamp-2">
                {alt.description}
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {Math.round(alt.confidence * 100)}% confidence
                </Badge>
                {selectedIndex === index && (
                  <Badge className="text-xs">Selected</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
} 