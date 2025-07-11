'use client'

import { useEffect } from 'react'
import { useToolStore } from '@/store/toolStore'
import { useFilterStore, TOGGLE_FILTER_TOOLS } from '@/store/filterStore'
import { tools } from '@/lib/editor/tools'
import { cn } from '@/lib/utils'

export function ToolPalette() {
  const { activeTool, setActiveTool, registerTools } = useToolStore()
  const { isFilterActive } = useFilterStore()
  
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
  
  // Separate regular tools from AI-native tools
  const regularTools = tools.filter(tool => !tool.id.startsWith('ai-'))
  const aiTools = tools.filter(tool => tool.id.startsWith('ai-'))
  
  return (
    <div className="w-14 bg-background border-r border-foreground/10 py-2">
      <div className="grid grid-cols-2 gap-0.5 px-1">
        {regularTools.map((tool) => {
          const Icon = tool.icon
          const isActive = activeTool === tool.id
          const isImplemented = tool.isImplemented
          const isToggleFilter = TOGGLE_FILTER_TOOLS.includes(tool.id as any)
          const hasFilterApplied = isToggleFilter && isFilterActive(tool.id)
          
          return (
            <button
              key={tool.id}
              data-tool-id={tool.id}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded transition-colors relative group",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : hasFilterApplied
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : isImplemented
                      ? "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
                      : "hover:bg-foreground/5 text-foreground/30 cursor-not-allowed"
              )}
              title={tool.shortcut ? `${tool.name} (${tool.shortcut})` : tool.name}
              onClick={() => handleToolClick(tool.id, isImplemented)}
            >
              <Icon 
                className="w-4 h-4" 
              />
              
              {/* Show indicator dot for active filters */}
              {hasFilterApplied && !isActive && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
              )}
              
              {/* Tool tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-background text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-foreground/10 shadow-lg">
                {tool.name} ({tool.shortcut})
                {hasFilterApplied && <span className="block text-primary text-[10px]">Filter active</span>}
                {!isImplemented && <span className="block text-foreground/60 text-[10px]">Coming soon</span>}
              </div>
            </button>
          )
        })}
        
        {/* Separator for AI tools */}
        {aiTools.length > 0 && (
          <>
            {/* Add empty cells to complete the row if needed */}
            {regularTools.length % 2 === 1 && <div className="w-6 h-6" />}
            
            {/* Separator line */}
            <div className="col-span-2 my-2 border-t border-foreground/20" />
            
            {/* AI Tools */}
            {aiTools.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id
              const isImplemented = tool.isImplemented
              
              return (
                <button
                  key={tool.id}
                  data-tool-id={tool.id}
                  className={cn(
                    "w-6 h-6 flex items-center justify-center rounded transition-colors relative group",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : isImplemented
                        ? "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
                        : "hover:bg-foreground/5 text-foreground/30 cursor-not-allowed"
                  )}
                  title={tool.shortcut ? `${tool.name} (${tool.shortcut})` : tool.name}
                  onClick={() => handleToolClick(tool.id, isImplemented)}
                >
                  <Icon 
                    className="w-4 h-4" 
                  />
                  
                  {/* Tool tooltip */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-background text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-foreground/10 shadow-lg">
                    {tool.name} {tool.shortcut ? `(${tool.shortcut})` : ''}
                    {!isImplemented && <span className="block text-foreground/60 text-[10px]">Coming soon</span>}
                    <span className="block text-foreground/60 text-[10px]">AI-Powered</span>
                  </div>
                </button>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
} 