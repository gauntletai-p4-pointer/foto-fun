'use client'

import { useEffect, useState, useRef } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { EventToolStore, useEventToolStore } from '@/lib/store/tools/EventToolStore'
import { tools } from '@/lib/editor/tools'
import { cn } from '@/lib/utils'
import { TOOL_GROUPS } from '@/constants'
import { ChevronRight } from 'lucide-react'

type ToolGroup = {
  id: string
  tools: typeof tools
  primaryTool: typeof tools[0]
}

export function ToolPalette() {
  const toolStore = useService<EventToolStore>('ToolStore')
  const toolState = useEventToolStore() // Subscribe to store changes
  const activeTool = toolState.activeTool // Use reactive state
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [selectedGroupTools, setSelectedGroupTools] = useState<Record<string, string>>({})
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const paletteRef = useRef<HTMLDivElement>(null)
  
  // Create tool groups
  const toolGroups: ToolGroup[] = []
  const ungroupedTools: typeof tools = []
  const processedToolIds = new Set<string>()
  
  // Process tool groups
  Object.entries(TOOL_GROUPS).forEach(([groupName, toolIds]) => {
    const groupTools = tools.filter(tool => (toolIds as readonly string[]).includes(tool.id))
    if (groupTools.length > 0) {
      groupTools.forEach(tool => processedToolIds.add(tool.id))
      
      // Use selected tool for this group or first tool
      const primaryToolId = selectedGroupTools[groupName] || groupTools[0].id
      const primaryTool = groupTools.find(t => t.id === primaryToolId) || groupTools[0]
      
      toolGroups.push({
        id: groupName,
        tools: groupTools,
        primaryTool
      })
    }
  })
  
  // Add ungrouped tools
  tools.forEach(tool => {
    if (!processedToolIds.has(tool.id) && !tool.id.startsWith('ai-')) {
      ungroupedTools.push(tool)
    }
  })
  
  // AI tools
  const aiTools = tools.filter(tool => tool.id.startsWith('ai-'))
  
  // Register tools on mount
  useEffect(() => {
    tools.forEach(tool => {
      const category = tool.id.startsWith('ai-') ? 'ai' : 
                      tool.id.includes('select') || tool.id.includes('marquee') || tool.id.includes('lasso') ? 'selection' :
                      tool.id.includes('move') || tool.id.includes('rotate') || tool.id.includes('scale') || tool.id.includes('crop') ? 'transform' :
                      tool.id.includes('brush') || tool.id.includes('eraser') ? 'drawing' :
                      tool.id.includes('brightness') || tool.id.includes('contrast') || tool.id.includes('saturation') || tool.id.includes('hue') || tool.id.includes('exposure') || tool.id.includes('color-temperature') ? 'adjustment' :
                      tool.id.includes('blur') || tool.id.includes('sharpen') || tool.id.includes('grayscale') || tool.id.includes('sepia') || tool.id.includes('invert') || tool.id.includes('vintage') ? 'filter' :
                      'other'
      
      toolStore.registerTool(tool, category)
    })
  }, [toolStore])
  
  // Close expanded group when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setExpandedGroup(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleToolClick = async (toolId: string, isImplemented: boolean, groupId?: string) => {
    console.log('[ToolPalette] handleToolClick:', { toolId, isImplemented, groupId, expandedGroup })
    
    if (!isImplemented) {
      alert('This tool is not implemented yet')
      return
    }
    
    await toolStore.activateTool(toolId)
    
    // Update selected tool for group
    if (groupId) {
      setSelectedGroupTools(prev => ({ ...prev, [groupId]: toolId }))
      // Always close the expanded group when a tool is selected
      setExpandedGroup(null)
    }
  }
  
  const handleGroupMouseDown = (groupId: string) => {
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      setExpandedGroup(groupId)
    }, 300)
  }
  
  const handleGroupMouseUp = () => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  
  const handleGroupMouseLeave = () => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  
  const handleGroupContextMenu = (e: React.MouseEvent, groupId: string) => {
    e.preventDefault()
    setExpandedGroup(expandedGroup === groupId ? null : groupId)
  }
  
  const renderTool = (tool: typeof tools[0], isInGroup = false, groupId?: string) => {
    const Icon = tool.icon
    const isActive = activeTool?.id === tool.id
    const isImplemented = tool.isImplemented
    
    return (
      <button
        key={tool.id}
        className={cn(
          "w-6 h-6 flex items-center justify-center rounded transition-colors relative",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : isImplemented
              ? "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
              : "hover:bg-foreground/5 text-foreground/30 cursor-not-allowed",
          isInGroup && "w-full h-7 justify-start px-2 gap-2"
        )}
        onClick={() => handleToolClick(tool.id, isImplemented, groupId)}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {isInGroup && (
          <span className="text-xs whitespace-nowrap">{tool.name}</span>
        )}
      </button>
    )
  }
  
  const renderToolGroup = (group: ToolGroup) => {
    const isActive = group.tools.some(tool => tool.id === activeTool?.id)
    const hasMultipleTools = group.tools.length > 1
    
    // Find the currently active tool in this group, or use the primary tool
    const activeGroupTool = group.tools.find(tool => tool.id === activeTool?.id) || group.primaryTool
    const Icon = activeGroupTool.icon
    
    const handleGroupClick = (e: React.MouseEvent) => {
      if (hasMultipleTools && e.shiftKey) {
        // Shift+click to expand group
        e.preventDefault()
        setExpandedGroup(expandedGroup === group.id ? null : group.id)
      } else if (!hasMultipleTools || expandedGroup === group.id) {
        // Single tool or group already expanded - activate tool
        handleToolClick(activeGroupTool.id, activeGroupTool.isImplemented, group.id)
      } else {
        // Multiple tools, not expanded - activate the active tool from this group
        handleToolClick(activeGroupTool.id, activeGroupTool.isImplemented, group.id)
      }
    }
    
    return (
      <div key={group.id} className="relative">
        <button
          className={cn(
            "w-6 h-6 flex items-center justify-center rounded transition-colors relative group",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
          )}
          onClick={handleGroupClick}
          onMouseDown={() => handleGroupMouseDown(group.id)}
          onMouseUp={handleGroupMouseUp}
          onMouseLeave={handleGroupMouseLeave}
          onContextMenu={(e) => handleGroupContextMenu(e, group.id)}
        >
          <Icon className="w-4 h-4" />
          
          {/* Group indicator */}
          {hasMultipleTools && (
            <ChevronRight className="absolute -bottom-0.5 -right-0.5 w-2 h-2" />
          )}
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-background text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] border border-foreground/10 shadow-lg">
            {activeGroupTool.name} {activeGroupTool.shortcut ? `(${activeGroupTool.shortcut})` : ''}
            {hasMultipleTools && <span className="block text-foreground/60 text-[10px]">Hold Shift+Click, right-click, or long-press for more</span>}
          </div>
        </button>
        
        {/* Expanded group menu */}
        {expandedGroup === group.id && (
          <div className="absolute left-full ml-1 top-0 bg-background border border-foreground/10 rounded shadow-lg z-[200] min-w-[150px]">
            {group.tools.map(tool => renderTool(tool, true, group.id))}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div ref={paletteRef} className="w-14 bg-background border-r border-foreground/10 py-2 flex-shrink-0 overflow-visible">
      <div className="grid grid-cols-2 gap-0.5 px-1">
        {/* Grouped tools */}
        {toolGroups.map(group => renderToolGroup(group))}
        
        {/* Ungrouped tools */}
        {ungroupedTools.map(tool => renderTool(tool))}
        
        {/* Separator for AI tools */}
        {aiTools.length > 0 && (
          <>
            {/* Add empty cells to complete the row if needed */}
            {(toolGroups.length + ungroupedTools.length) % 2 === 1 && <div className="w-6 h-6" />}
            
            {/* Separator line */}
            <div className="col-span-2 my-2 border-t border-foreground/20" />
            
            {/* AI Tools */}
            {aiTools.map(tool => {
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
                  <Icon className="w-4 h-4" />
                  
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