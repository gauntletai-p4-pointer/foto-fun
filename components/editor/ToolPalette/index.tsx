'use client'

import { useEffect } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { tools } from '@/lib/editor/tools'
import { cn } from '@/lib/utils'

export function ToolPalette() {
  const toolStore = useService<EventToolStore>('ToolStore')
  const activeTool = toolStore.getActiveTool()
  
  // Register tools on mount
  useEffect(() => {
    tools.forEach(tool => {
      // Determine category based on tool ID
      const category = tool.id.startsWith('ai-') ? 'ai' : 
                      tool.id.includes('select') || tool.id.includes('marquee') || tool.id.includes('lasso') ? 'selection' :
                      tool.id.includes('move') || tool.id.includes('rotate') || tool.id.includes('scale') || tool.id.includes('crop') ? 'transform' :
                      tool.id.includes('brush') || tool.id.includes('eraser') ? 'drawing' :
                      tool.id.includes('brightness') || tool.id.includes('contrast') || tool.id.includes('saturation') ? 'adjustment' :
                      'other'
      
      // Register the actual tool instance
      toolStore.registerTool(tool, category)
    })
  }, [toolStore])
  
  const handleToolClick = async (toolId: string, isImplemented: boolean) => {
    if (!isImplemented) {
      alert('This tool is not implemented yet')
      return
    }
    await toolStore.activateTool(toolId)
  }
  
  // Separate regular tools from AI-native tools
  const regularTools = tools.filter(tool => !tool.id.startsWith('ai-'))
  const aiTools = tools.filter(tool => tool.id.startsWith('ai-'))
  
  return (
    <div className="w-14 bg-background border-r border-foreground/10 py-2 flex-shrink-0 overflow-visible">
      <div className="grid grid-cols-2 gap-0.5 px-1">
        {regularTools.map((tool) => {
          const Icon = tool.icon
          const isActive = activeTool?.id === tool.id
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
              onClick={() => handleToolClick(tool.id, isImplemented)}
            >
              <Icon 
                className="w-4 h-4" 
              />
              
              {/* Tool tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-background text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] border border-foreground/10 shadow-lg">
                {tool.name} ({tool.shortcut})
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
              const isActive = activeTool?.id === tool.id
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
                  onClick={() => handleToolClick(tool.id, isImplemented)}
                >
                  <Icon 
                    className="w-4 h-4" 
                  />
                  
                  {/* Tool tooltip */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-background text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] border border-foreground/10 shadow-lg">
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