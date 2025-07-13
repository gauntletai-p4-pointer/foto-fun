'use client'

import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ObjectsPanel } from './ObjectsPanel'
import { CharacterPanel } from './CharacterPanel'
import { ParagraphPanel } from './ParagraphPanel'
import { GlyphsPanel } from './GlyphsPanel'
import { TextEffectsPanel } from './TextEffectsPanel'
import { AdjustmentsPanel } from './AdjustmentsPanel'
import { AIChat } from './AIChat'
import { HistoryPanel } from './HistoryPanel'
import { Bot, Square, Type, AlignLeft, Sparkles, Shapes, Sliders, Clock } from 'lucide-react'
import { featureManager, FEATURES, type Feature } from '@/lib/config/features'

type PanelType = 'ai' | 'objects' | 'history' | 'character' | 'paragraph' | 'glyphs' | 'effects' | 'adjustments'

interface PanelTab {
  id: PanelType
  label: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType
  feature?: string
}

const allPanels: PanelTab[] = [
  { id: 'ai', label: 'AI', icon: Bot, component: AIChat, feature: FEATURES.AI_CHAT },
  { id: 'objects', label: 'Objects', icon: Square, component: ObjectsPanel },
  { id: 'history', label: 'History', icon: Clock, component: HistoryPanel },
  { id: 'adjustments', label: 'Adjustments', icon: Sliders, component: AdjustmentsPanel },
  { id: 'character', label: 'Character', icon: Type, component: CharacterPanel },
  { id: 'paragraph', label: 'Paragraph', icon: AlignLeft, component: ParagraphPanel },
  { id: 'glyphs', label: 'Glyphs', icon: Shapes, component: GlyphsPanel },
  { id: 'effects', label: 'Effects', icon: Sparkles, component: TextEffectsPanel },
]

export function Panels() {
  const [mounted, setMounted] = useState(false)
  
  // Filter panels based on feature availability (client-side only)
  const panels = useMemo(() => {
    if (!mounted) {
      // On server/initial render, show all panels except those with features
      return allPanels.filter(panel => !panel.feature)
    }
    
    // On client, check if features are enabled
    return allPanels.filter(panel => {
      if (!panel.feature) return true
      return featureManager.isFeatureEnabled(panel.feature as Feature)
    })
  }, [mounted])
  
  // Set initial panel - determine the best default upfront
  const [activePanel, setActivePanel] = useState<PanelType>(() => {
    // Check if AI feature is likely to be available (optimistic)
    // This prevents the layout shift by making the right choice upfront
    if (typeof window !== 'undefined') {
      // Client-side: we can check features
      try {
        const aiAvailable = allPanels.find(p => p.id === 'ai' && (!p.feature || featureManager.isFeatureEnabled(p.feature as Feature)))
        if (aiAvailable) {
          return 'ai'
        }
      } catch {
        // Feature manager not ready, fall back to objects
      }
    }
    // Default to objects which is always available
    return 'objects'
  })
  
  // Update mounted state after hydration
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Only adjust panel selection if the current selection is not available
  useEffect(() => {
    if (mounted && panels.length > 0) {
      const currentPanelAvailable = panels.find(p => p.id === activePanel)
      if (!currentPanelAvailable) {
        // Current panel is not available, switch to first available
        const firstAvailable = panels[0]
        if (firstAvailable) {
          setActivePanel(firstAvailable.id)
        }
      }
    }
  }, [mounted, panels, activePanel]) // Include activePanel dependency
  
  const ActivePanelComponent = panels.find(p => p.id === activePanel)?.component || ObjectsPanel
  
  return (
    <div className="w-full h-full bg-background border-l border-foreground/10 flex flex-col overflow-hidden">
      <div className="p-2 border-b border-foreground/10 flex-shrink-0">
        <div className="flex gap-1">
          {panels.map((panel) => {
            const Icon = panel.icon
            return (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={cn(
                  "flex-1 flex items-center justify-center p-2 rounded text-xs font-medium transition-colors",
                  activePanel === panel.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
                )}
                title={panel.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto min-h-0">
        <ActivePanelComponent />
      </div>
    </div>
  )
} 