'use client'

// This component is not currently used as we're using GlyphGrid for all displays
// Kept for potential future use if we want a different layout for recent glyphs

import { Button } from '@/components/ui/button'

interface RecentGlyphsProps {
  glyphs: string[]
  onSelect: (glyph: string) => void
}

export function RecentGlyphs({ glyphs, onSelect }: RecentGlyphsProps) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {glyphs.map((glyph, index) => (
        <Button
          key={`recent-${glyph}-${index}`}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onSelect(glyph)}
        >
          <span className="text-base">{glyph}</span>
        </Button>
      ))}
    </div>
  )
} 