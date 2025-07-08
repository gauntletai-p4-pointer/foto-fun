'use client'

import { useEffect } from 'react'
import { useToolStore } from '@/store/toolStore'
import { tools } from '@/lib/tools'
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
    <div className="w-14 bg-background border-r border-border py-2">
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
                  ? "bg-primary hover:bg-primary/90" 
                  : isImplemented
                    ? "hover:bg-accent hover:text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground opacity-50 cursor-not-allowed"
              )}
              title={`${tool.name} (${tool.shortcut})`}
              onClick={() => handleToolClick(tool.id, isImplemented)}
            >
              <Icon 
                className={cn(
                  "w-4 h-4",
                  isActive ? "text-primary-foreground" : "text-foreground/70"
                )} 
              />
              
              {/* Tool tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-border">
                {tool.name} ({tool.shortcut})
                {!isImplemented && <span className="block text-muted-foreground text-[10px]">Coming soon</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
} 