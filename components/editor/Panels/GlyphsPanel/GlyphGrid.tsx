'use client'

import { Button } from '@/components/ui/button'

interface GlyphGridProps {
  glyphs: string[]
  onSelect: (glyph: string) => void
}

/**
 * Grid display for glyphs (emojis or special characters)
 */
export function GlyphGrid({ glyphs, onSelect }: GlyphGridProps) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {glyphs.map((glyph, index) => (
        <Button
          key={`${glyph}-${index}`}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-primary/10"
          onClick={() => onSelect(glyph)}
          title={glyph}
        >
          <span className="text-lg">{glyph}</span>
        </Button>
      ))}
    </div>
  )
} 