'use client'

import { useEffect } from 'react'
import { useToolStore } from '@/store/toolStore'
import { tools } from '@/lib/editor/tools'
import { cn } from '@/lib/utils'

export function ToolPalette() {
  const { activeTool, setActiveTool, registerTools } = useToolStore()
  
  // Register tools on mount
  useEffect(() => {
    registerTools(tools)
  }, [registerTools])
  
  const handleToolClick = (toolId: string, isImplemented: boolean) => {
    if (!isImplemented) {
      alert('This tool is not implemented yet')
      return
    }
    setActiveTool(toolId)
  }
  
  return (
    <div className="w-14 bg-background border-r border-foreground/10 py-2">
      <div className="grid grid-cols-2 gap-0.5 px-1">
        {tools.map((tool) => {
          const Icon = tool.icon
          const isActive = activeTool === tool.id
          const isImplemented = tool.isImplemented
          
          return (
            <button
              key={tool.id}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded transition-colors relative group",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : isImplemented
                    ? "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
                    : "hover:bg-foreground/5 text-foreground/30 cursor-not-allowed"
              )}
              title={`${tool.name} (${tool.shortcut})`}
              onClick={() => handleToolClick(tool.id, isImplemented)}
            >
              <Icon 
                className="w-4 h-4" 
              />
              
              {/* Tool tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-background text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-foreground/10 shadow-lg">
                {tool.name} ({tool.shortcut})
                {!isImplemented && <span className="block text-foreground/60 text-[10px]">Coming soon</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
} 