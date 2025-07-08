'use client'

import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { LayersPanel } from './LayersPanel'
import { CharacterPanel } from './CharacterPanel'
import { ParagraphPanel } from './ParagraphPanel'
import { GlyphsPanel } from './GlyphsPanel'
import { TextEffectsPanel } from './TextEffectsPanel'
import { AIChat } from './AIChat'
import { Bot, Layers, Type, AlignLeft, Sparkles, Shapes } from 'lucide-react'
import { featureManager, FEATURES, type Feature } from '@/lib/config/features'

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
  
  // Set initial panel to AI if available, otherwise first available panel
  const getInitialPanel = (): PanelType => {
    // Check if AI panel is available
    const aiPanel = panels.find(p => p.id === 'ai')
    if (aiPanel) return 'ai'
    
    // Otherwise use first available panel
    return panels.length > 0 ? panels[0].id : 'layers'
  }
  
  const [activePanel, setActivePanel] = useState<PanelType>(getInitialPanel())
  
  // Update mounted state after hydration
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Update active panel after mount to set AI as default if available
  useEffect(() => {
    if (mounted) {
      const aiPanel = panels.find(p => p.id === 'ai')
      if (aiPanel && activePanel !== 'ai') {
        setActivePanel('ai')
      } else if (!panels.find(p => p.id === activePanel)) {
        // If current panel is not available, switch to first available
        setActivePanel(panels.length > 0 ? panels[0].id : 'layers')
      }
    }
  }, [panels, mounted, activePanel])
  
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