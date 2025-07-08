'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FontManager } from '@/lib/editor/fonts/FontManager'
import { FONT_DATABASE } from '@/lib/editor/fonts/FontDatabase'
import type { FontInfo } from '@/types/text'

interface FontSelectorProps {
  value: string
  onChange: (fontFamily: string) => void
}

export function FontSelector({ value, onChange }: FontSelectorProps) {
  const [fonts, setFonts] = useState<FontInfo[]>([])
  const [loading, setLoading] = useState(false)
  const fontManager = FontManager.getInstance()
  
  useEffect(() => {
    // Load available fonts
    const loadFonts = async () => {
      const systemFonts = FONT_DATABASE.system.map(family => ({
        family,
        name: family,
        category: 'system' as const
      }))
      
      const googleFonts = FONT_DATABASE.google.map(family => ({
        family,
        name: family,
        category: 'google' as const
      }))
      
      setFonts([...systemFonts, ...googleFonts])
    }
    
    loadFonts()
  }, [])
  
  const handleFontChange = async (fontFamily: string) => {
    setLoading(true)
    try {
      // Load font if it's a Google font
      const font = fonts.find(f => f.family === fontFamily)
      if (font && font.category === 'google') {
        await fontManager.loadGoogleFont(fontFamily)
      }
      
      onChange(fontFamily)
    } catch (error) {
      console.error('Failed to load font:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground">Font</label>
      <Select value={value} onValueChange={handleFontChange} disabled={loading}>
        <SelectTrigger className="w-full h-8">
          <SelectValue>
            <span style={{ fontFamily: value }}>{value}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">
            System Fonts
          </div>
          {fonts
            .filter(font => font.category === 'system')
            .map(font => (
              <SelectItem 
                key={font.family} 
                value={font.family}
                className="font-preview"
              >
                <span style={{ fontFamily: font.family }}>{font.name}</span>
              </SelectItem>
            ))}
          
          <div className="text-xs font-semibold px-2 py-1 text-muted-foreground mt-2">
            Google Fonts
          </div>
          {fonts
            .filter(font => font.category === 'google')
            .map(font => (
              <SelectItem 
                key={font.family} 
                value={font.family}
                className="font-preview"
              >
                <span style={{ fontFamily: font.family }}>{font.name}</span>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
} 