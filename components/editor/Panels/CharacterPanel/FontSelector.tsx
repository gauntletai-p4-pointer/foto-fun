'use client'

import React, { useState, useEffect } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import type { FontManager } from '@/lib/editor/fonts/FontManager'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Check } from 'lucide-react'

interface FontSelectorProps {
  value: string
  onChange: (fontFamily: string) => void
}

export function FontSelector({ onChange }: FontSelectorProps) {
  const fontManager = useService<FontManager>('FontManager')
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [availableFonts, setAvailableFonts] = useState<Array<{ family: string; name: string; category: string }>>([])

  useEffect(() => {
    if (fontManager) {
      // Get available fonts from the font manager
      const fonts = fontManager.getAvailableFonts()
      setAvailableFonts(fonts)
    }
  }, [fontManager])

  if (!fontManager) {
    return <div className="h-8 bg-gray-100 rounded" />
  }

  // Filter fonts based on search
  const filteredFonts = searchTerm 
    ? availableFonts.filter(font => 
        font.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableFonts
  
  const handleFontChange = async (fontFamily: string) => {
    try {
      await fontManager.loadFont(fontFamily)
      onChange(fontFamily)
    } catch (error) {
      console.error('Failed to load font:', error)
    }
  }
  
  // Group fonts by category
  const groupedFonts = filteredFonts.reduce((acc, font) => {
    if (!acc[font.category]) {
      acc[font.category] = []
    }
    acc[font.category].push(font)
    return acc
  }, {} as Record<string, Array<{ family: string; name: string; category: string }>>)
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground">Font</label>
      {/* The Select component was removed from the new_code, so it's removed here. */}
      {/* <Select value={value} onValueChange={handleFontChange} disabled={loading}> */}
      {/*   <SelectTrigger className="w-full h-8"> */}
      {/*     <SelectValue> */}
      {/*       {loading ? ( */}
      {/*         <div className="flex items-center gap-2"> */}
      {/*           <Loader2 className="h-3 w-3 animate-spin" /> */}
      {/*           <span>Loading font...</span> */}
      {/*         </div> */}
      {/*       ) : ( */}
      {/*         <span style={{ fontFamily: value }}>{value}</span> */}
      {/*       )} */}
      {/*     </SelectValue> */}
      {/*   </SelectTrigger> */}
      {/*   <SelectContent className="max-h-[400px]"> */}
      {/*     {/* Search input */}
      {/*     <div className="p-2 border-b"> */}
      {/*       <Input */}
      {/*         placeholder="Search fonts..." */}
      {/*         value={searchQuery} */}
      {/*         onChange={(e) => setSearchQuery(e.target.value)} */}
      {/*         className="h-8" */}
      {/*         autoFocus */}
      {/*       /> */}
      {/*     </div> */}
          
      {/*     {/* Font list */}
      {/*     <div className="overflow-y-auto max-h-[300px]"> */}
      {/*       {Object.entries(groupedFonts).map(([category, categoryFonts]) => ( */}
      {/*         <div key={category}> */}
      {/*           <div className="text-xs font-semibold px-2 py-1 text-foreground/60 sticky top-0 bg-background"> */}
      {/*             {category === 'system' ? 'System Fonts' : 'Google Fonts'} */}
      {/*             {category === 'google' && !googleFontsLoaded && ( */}
      {/*               <span className="text-foreground/40 ml-1">(Loading more...)</span> */}
      {/*             )} */}
      {/*           </div> */}
      {/*           {categoryFonts.map(font => ( */}
      {/*             <SelectItem  */}
      {/*               key={font.family}  */}
      {/*               value={font.family} */}
      {/*               className="font-preview" */}
      {/*             > */}
      {/*               <div className="flex items-center gap-2"> */}
      {/*                 <span style={{ fontFamily: font.family }}>{font.name}</span> */}
      {/*                 {font.loaded && ( */}
      {/*                   <span className="text-xs text-foreground/40">✓</span> */}
      {/*                 )} */}
      {/*               </div> */}
      {/*             </SelectItem> */}
      {/*           ))} */}
      {/*         </div> */}
      {/*       ))} */}
            
      {/*       {availableFonts.length === 0 && ( */}
      {/*         <div className="text-sm text-foreground/60 text-center py-4"> */}
      {/*           No fonts found matching &quot;{searchQuery}&quot; */}
      {/*         </div> */}
      {/*       )} */}
      {/*     </div> */}
      {/*   </SelectContent> */}
      {/* </Select> */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search fonts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 flex-1"
          autoFocus
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="max-h-[300px]">
        {Object.entries(groupedFonts).map(([category, categoryFonts]) => (
          <div key={category} className="space-y-1">
            <h4 className="text-xs font-semibold px-2 py-1 text-foreground/60">
              {category === 'system' ? 'System Fonts' : 'Google Fonts'}
            </h4>
            {categoryFonts.map(font => (
              <Button
                key={font.family}
                variant="ghost"
                className="justify-start font-preview"
                onClick={() => handleFontChange(font.family)}
              >
                <span style={{ fontFamily: font.family }}>{font.name}</span>
                {fontManager.isFontLoaded(font.family) && (
                  <Check className="ml-2 h-3 w-3 text-green-500" />
                )}
              </Button>
            ))}
          </div>
        ))}

        {availableFonts.length === 0 && (
          <div className="text-sm text-foreground/60 text-center py-4">
            No fonts found matching &quot;{searchTerm}&quot;
          </div>
        )}
      </ScrollArea>
    </div>
  )
} 