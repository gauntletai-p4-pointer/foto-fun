'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { FontManager } from '@/lib/editor/fonts/FontManager'
import type { FontInfo } from '@/types/text'

interface FontSelectorProps {
  value: string
  onChange: (fontFamily: string) => void
}

export function FontSelector({ value, onChange }: FontSelectorProps) {
  const [fonts, setFonts] = useState<FontInfo[]>([])
  const [filteredFonts, setFilteredFonts] = useState<FontInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [googleFontsLoaded, setGoogleFontsLoaded] = useState(false)
  const fontManager = FontManager.getInstance()
  
  // Load initial fonts
  useEffect(() => {
    const loadInitialFonts = async () => {
      const availableFonts = fontManager.getAvailableFonts()
      setFonts(availableFonts)
      setFilteredFonts(availableFonts)
      
      // Load full Google Fonts list in background
      fontManager.loadGoogleFontsList().then(() => {
        const updatedFonts = fontManager.getAvailableFonts()
        setFonts(updatedFonts)
        setFilteredFonts(updatedFonts)
        setGoogleFontsLoaded(true)
      })
    }
    
    loadInitialFonts()
  }, [fontManager])
  
  // Filter fonts based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredFonts(fonts)
      return
    }
    
    const query = searchQuery.toLowerCase()
    const filtered = fonts.filter(font => 
      font.name.toLowerCase().includes(query)
    )
    setFilteredFonts(filtered)
  }, [searchQuery, fonts])
  
  const handleFontChange = useCallback(async (fontFamily: string) => {
    setLoading(true)
    try {
      await fontManager.loadFont(fontFamily)
      onChange(fontFamily)
    } catch (error) {
      console.error('Failed to load font:', error)
    } finally {
      setLoading(false)
    }
  }, [fontManager, onChange])
  
  // Group fonts by category
  const groupedFonts = filteredFonts.reduce((acc, font) => {
    if (!acc[font.category]) {
      acc[font.category] = []
    }
    acc[font.category].push(font)
    return acc
  }, {} as Record<string, FontInfo[]>)
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground">Font</label>
      <Select value={value} onValueChange={handleFontChange} disabled={loading}>
        <SelectTrigger className="w-full h-8">
          <SelectValue>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading font...</span>
              </div>
            ) : (
              <span style={{ fontFamily: value }}>{value}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {/* Search input */}
          <div className="p-2 border-b">
            <Input
              placeholder="Search fonts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
          
          {/* Font list */}
          <div className="overflow-y-auto max-h-[300px]">
            {Object.entries(groupedFonts).map(([category, categoryFonts]) => (
              <div key={category}>
                <div className="text-xs font-semibold px-2 py-1 text-foreground/60 sticky top-0 bg-background">
                  {category === 'system' ? 'System Fonts' : 'Google Fonts'}
                  {category === 'google' && !googleFontsLoaded && (
                    <span className="text-foreground/40 ml-1">(Loading more...)</span>
                  )}
                </div>
                {categoryFonts.map(font => (
                  <SelectItem 
                    key={font.family} 
                    value={font.family}
                    className="font-preview"
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: font.family }}>{font.name}</span>
                      {font.loaded && (
                        <span className="text-xs text-foreground/40">✓</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
            
            {filteredFonts.length === 0 && (
              <div className="text-sm text-foreground/60 text-center py-4">
                No fonts found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  )
} 