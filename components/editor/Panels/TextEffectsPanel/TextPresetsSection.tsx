'use client'

import { Button } from '@/components/ui/button'
import { IText, Textbox } from 'fabric'
import { TextLayerStyles } from '@/lib/editor/text/effects'

interface TextPresetsSectionProps {
  object: IText | Textbox
  onChange: () => void
}

export function TextPresetsSection({ object, onChange }: TextPresetsSectionProps) {
  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'neon':
        // Neon effect
        TextLayerStyles.applyEffects(object, {
          stroke: {
            color: '#ffffff',
            width: 2,
            position: 'center',
          },
          glow: {
            type: 'outer',
            color: '#00ffff',
            size: 20,
            opacity: 0.8,
          },
        })
        break
        
      case 'shadow':
        // Classic drop shadow
        TextLayerStyles.applyEffects(object, {
          dropShadow: {
            color: '#000000',
            opacity: 0.5,
            angle: 45,
            distance: 5,
            blur: 5,
          },
        })
        break
        
      case 'outline':
        // Bold outline
        TextLayerStyles.applyEffects(object, {
          stroke: {
            color: '#000000',
            width: 4,
            position: 'outside',
          },
        })
        object.set({ fill: '#ffffff' })
        break
    }
    
    onChange()
  }
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Presets</h4>
      <div className="grid grid-cols-3 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => applyPreset('neon')}
        >
          Neon
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => applyPreset('shadow')}
        >
          Shadow
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => applyPreset('outline')}
        >
          Outline
        </Button>
      </div>
    </div>
  )
} 