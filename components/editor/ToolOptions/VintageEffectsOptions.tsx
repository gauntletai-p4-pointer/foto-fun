'use client'

import { useEffect, useState } from 'react'
import { VintageEffectsTool } from '@/lib/editor/tools/filters/vintageEffectsTool'
import { cn } from '@/lib/utils'

interface VintageEffectsOptionsProps {
  tool: VintageEffectsTool
  onChange: (optionId: string, value: unknown) => void
}

export function VintageEffectsOptions({ tool, onChange }: VintageEffectsOptionsProps) {
  const [selectedEffect, setSelectedEffect] = useState('brownie')
  
  const effects = tool.getAvailableEffects()
  
  // Get current effect from tool options
  useEffect(() => {
    const currentEffect = tool.getOption('effect') as string
    if (currentEffect) {
      setSelectedEffect(currentEffect)
    }
  }, [tool])
  
  const handleEffectSelect = (effectId: string) => {
    setSelectedEffect(effectId)
    onChange('effect', effectId)
  }
  
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">
          Vintage Effect:
        </label>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {effects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => handleEffectSelect(effect.id)}
            className={cn(
              "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
              selectedEffect === effect.id
                ? "border-primary shadow-lg scale-105"
                : "border-transparent hover:border-foreground/20"
            )}
            title={effect.description}
          >
            <div className="w-full h-20 bg-foreground/5 flex items-center justify-center">
              <span className="text-[10px] text-foreground/60 text-center px-1">
                {effect.name}
              </span>
            </div>
            
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-1">
              <span className="text-xs font-medium text-foreground">
                {effect.name}
              </span>
            </div>
            
            {/* Hover tooltip */}
            <div className="absolute inset-x-0 -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-background text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-foreground/10 shadow-lg">
              {effect.description}
            </div>
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => tool.removeVintageEffect()}
          className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
        >
          Remove Effect
        </button>

      </div>
    </div>
  )
} 