'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { LayersPanel } from './LayersPanel'
import { CharacterPanel } from './CharacterPanel'
import { ParagraphPanel } from './ParagraphPanel'
import { GlyphsPanel } from './GlyphsPanel'
import { TextEffectsPanel } from './TextEffectsPanel'
import { AIChat } from './AIChat'
import { Bot, Layers, Type, AlignLeft, Sparkles, Shapes } from 'lucide-react'
import { featureManager, FEATURES } from '@/lib/config/features'

type PanelType = 'ai' | 'layers' | 'character' | 'paragraph' | 'glyphs' | 'effects'

interface PanelTab {
  id: PanelType
  label: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType
  feature?: string
}

const allPanels: PanelTab[] = [
  { id: 'ai', label: 'AI', icon: Bot, component: AIChat, feature: FEATURES.AI_CHAT },
  { id: 'layers', label: 'Layers', icon: Layers, component: LayersPanel },
  { id: 'character', label: 'Character', icon: Type, component: CharacterPanel },
  { id: 'paragraph', label: 'Paragraph', icon: AlignLeft, component: ParagraphPanel },
  { id: 'glyphs', label: 'Glyphs', icon: Shapes, component: GlyphsPanel },
  { id: 'effects', label: 'Effects', icon: Sparkles, component: TextEffectsPanel },
]

export function Panels() {
  // Filter panels based on feature availability
  const panels = useMemo(() => {
    return allPanels.filter(panel => {
      if (!panel.feature) return true // Always show panels without feature requirements
      return featureManager.isFeatureAvailable(panel.feature as any)
    })
  }, [])
  
  // Set initial panel to first available panel
  const [activePanel, setActivePanel] = useState<PanelType>(
    panels.length > 0 ? panels[0].id : 'layers'
  )
  
  const ActivePanelComponent = panels.find(p => p.id === activePanel)?.component || LayersPanel
  
  return (
    <div className="w-64 bg-background border-l border-foreground/10 flex flex-col h-full">
      <div className="p-2 border-b border-foreground/10">
        <div className="flex gap-1">
          {panels.map((panel) => {
            const Icon = panel.icon
            return (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors",
                  activePanel === panel.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
                )}
                title={panel.label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="sr-only">{panel.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ActivePanelComponent />
      </div>
    </div>
  )
} 