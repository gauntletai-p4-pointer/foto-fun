'use client'

import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { LayersPanel } from './LayersPanel'
import { CharacterPanel } from './CharacterPanel'
import { ParagraphPanel } from './ParagraphPanel'
import { GlyphsPanel } from './GlyphsPanel'
import { TextEffectsPanel } from './TextEffectsPanel'
import { AIChat } from './AIChat'
import { Bot, Layers, Type, AlignLeft, Sparkles, Shapes, ChevronLeft, ChevronRight, X } from 'lucide-react'
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
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  
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
  
  // Set initial panel
  const [activePanel, setActivePanel] = useState<PanelType>(() => {
    // Default to layers which is always available
    return 'layers'
  })
  
  // Update mounted state after hydration
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Set AI as default panel only once after mount if available
  useEffect(() => {
    if (mounted && panels.length > 0) {
      const aiPanel = panels.find(p => p.id === 'ai')
      if (aiPanel) {
        setActivePanel('ai')
      }
    }
  }, [mounted, panels]) // Include panels dependency
  
  // Close mobile panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobilePanelOpen && event.target instanceof Element) {
        const mobilePanel = document.getElementById('mobile-panel')
        if (mobilePanel && !mobilePanel.contains(event.target)) {
          setIsMobilePanelOpen(false)
        }
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMobilePanelOpen])
  
  const ActivePanelComponent = panels.find(p => p.id === activePanel)?.component || LayersPanel
  
  return (
    <>
      {/* Desktop Panel */}
      <div className="hidden md:flex w-80 bg-background border-l border-foreground/10 flex-col h-full flex-shrink-0">
        <div className="p-2 border-b border-foreground/10">
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
        
        <div className="flex-1 overflow-auto">
          <ActivePanelComponent />
        </div>
      </div>
      
      {/* Mobile Panel Toggle Button */}
      <button
        onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
        className="md:hidden fixed top-1/2 -translate-y-1/2 right-0 z-40 bg-background border border-foreground/10 rounded-l-lg p-2 shadow-lg hover:bg-foreground/5 transition-colors"
        title="Toggle Panel"
      >
        {isMobilePanelOpen ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
      
      {/* Mobile Panel Overlay */}
      {isMobilePanelOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40" 
            onClick={() => setIsMobilePanelOpen(false)}
          />
          <div 
            id="mobile-panel"
            className="md:hidden fixed right-0 top-0 h-full w-80 bg-background border-l border-foreground/10 flex flex-col z-50 transform translate-x-0 transition-transform duration-300"
          >
            <div className="p-2 border-b border-foreground/10 flex items-center justify-between">
              <div className="flex gap-1 flex-1">
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
              <button
                onClick={() => setIsMobilePanelOpen(false)}
                className="ml-2 p-1 rounded hover:bg-foreground/5 transition-colors"
                title="Close Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              <ActivePanelComponent />
            </div>
          </div>
        </>
      )}
    </>
  )
} 