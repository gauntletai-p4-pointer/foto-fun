'use client'

import { useState, useEffect } from 'react'
import { IText, Textbox } from 'fabric'
import { useCanvasStore } from '@/store/canvasStore'
import { Smile, Hash, AtSign, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { GlyphGrid } from './GlyphGrid'
import { EMOJI_CATEGORIES, SPECIAL_CHARACTERS } from './glyphData'

/**
 * Glyphs Panel - Insert emojis and special characters into text
 */
export function GlyphsPanel() {
  const { fabricCanvas } = useCanvasStore()
  const [activeTextObject, setActiveTextObject] = useState<IText | Textbox | null>(null)
  const [category, setCategory] = useState<'emoji' | 'symbols' | 'recent'>('emoji')
  const [emojiCategory, setEmojiCategory] = useState<string>('smileys')
  const [searchQuery, setSearchQuery] = useState('')
  const [recentGlyphs, setRecentGlyphs] = useState<string[]>([])
  
  useEffect(() => {
    if (!fabricCanvas) return
    
    const handleSelection = () => {
      const activeObject = fabricCanvas.getActiveObject()
      if (activeObject && (activeObject instanceof IText || activeObject instanceof Textbox)) {
        setActiveTextObject(activeObject)
      } else {
        setActiveTextObject(null)
      }
    }
    
    // Initial check
    handleSelection()
    
    // Listen for selection changes
    fabricCanvas.on('selection:created', handleSelection)
    fabricCanvas.on('selection:updated', handleSelection)
    fabricCanvas.on('selection:cleared', () => setActiveTextObject(null))
    
    return () => {
      fabricCanvas.off('selection:created', handleSelection)
      fabricCanvas.off('selection:updated', handleSelection)
      fabricCanvas.off('selection:cleared')
    }
  }, [fabricCanvas])
  
  // Load recent glyphs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentGlyphs')
    if (saved) {
      setRecentGlyphs(JSON.parse(saved))
    }
  }, [])
  
  const handleGlyphSelect = (glyph: string) => {
    if (!activeTextObject || !activeTextObject.isEditing) return
    
    // Insert glyph at cursor position
    const cursorPosition = activeTextObject.selectionStart || 0
    const currentText = activeTextObject.text || ''
    const newText = currentText.slice(0, cursorPosition) + glyph + currentText.slice(cursorPosition)
    
    activeTextObject.set('text', newText)
    activeTextObject.selectionStart = cursorPosition + glyph.length
    activeTextObject.selectionEnd = cursorPosition + glyph.length
    
    // Update recent glyphs
    const newRecent = [glyph, ...recentGlyphs.filter(g => g !== glyph)].slice(0, 20)
    setRecentGlyphs(newRecent)
    localStorage.setItem('recentGlyphs', JSON.stringify(newRecent))
    
    fabricCanvas?.renderAll()
  }
  
  if (!activeTextObject) {
    return (
      <div className="p-4 text-center text-foreground/60">
        <Hash className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Select text to insert glyphs</p>
      </div>
    )
  }
  
  const getGlyphsToShow = () => {
    if (category === 'recent') {
      return recentGlyphs
    }
    
    if (category === 'emoji') {
      const categoryData = EMOJI_CATEGORIES[emojiCategory]
      if (!categoryData) return []
      
      if (searchQuery) {
        return categoryData.emojis.filter(emoji => 
          emoji.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(e => e.char)
      }
      
      return categoryData.emojis.map(e => e.char)
    }
    
    if (category === 'symbols') {
      const allSymbols = Object.values(SPECIAL_CHARACTERS).flat()
      if (searchQuery) {
        return allSymbols.filter(char => 
          char.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(c => c.char)
      }
      return allSymbols.map(c => c.char)
    }
    
    return []
  }
  
  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <h3 className="font-semibold text-sm text-foreground">Glyphs</h3>
      
      {/* Category Tabs */}
      <ToggleGroup 
        type="single" 
        value={category} 
        onValueChange={(value) => value && setCategory(value as 'emoji' | 'symbols' | 'recent')}
        className="justify-center"
      >
        <ToggleGroupItem value="emoji" aria-label="Emojis">
          <Smile className="h-4 w-4 mr-1" />
          Emoji
        </ToggleGroupItem>
        <ToggleGroupItem value="symbols" aria-label="Symbols">
          <AtSign className="h-4 w-4 mr-1" />
          Symbols
        </ToggleGroupItem>
        <ToggleGroupItem value="recent" aria-label="Recent">
          <Sparkles className="h-4 w-4 mr-1" />
          Recent
        </ToggleGroupItem>
      </ToggleGroup>
      
      {/* Search */}
      {category !== 'recent' && (
        <Input
          type="text"
          placeholder={`Search ${category}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8"
        />
      )}
      
      {/* Emoji Categories */}
      {category === 'emoji' && !searchQuery && (
        <div className="flex gap-1 flex-wrap">
          {Object.entries(EMOJI_CATEGORIES).map(([key, data]) => (
            <Button
              key={key}
              variant={emojiCategory === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEmojiCategory(key)}
              className="h-7 px-2"
            >
              <span className="text-base mr-1">{data.icon}</span>
              <span className="text-xs">{data.name}</span>
            </Button>
          ))}
        </div>
      )}
      
      {/* Glyph Grid */}
      <ScrollArea className="flex-1">
        {category === 'recent' && recentGlyphs.length === 0 ? (
          <div className="text-center text-foreground/60 py-8">
            <p className="text-sm">No recent glyphs</p>
            <p className="text-xs mt-1">Selected glyphs will appear here</p>
          </div>
        ) : (
          <GlyphGrid
            glyphs={getGlyphsToShow()}
            onSelect={handleGlyphSelect}
          />
        )}
      </ScrollArea>
      
      {/* Active text indicator */}
      {activeTextObject.isEditing && (
        <div className="text-xs text-foreground/60 text-center">
          Click a glyph to insert at cursor
        </div>
      )}
    </div>
  )
} 