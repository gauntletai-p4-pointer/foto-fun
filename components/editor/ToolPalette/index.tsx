'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useService } from '@/lib/core/AppInitializer'
import { EventToolStore, useEventToolStore } from '@/lib/store/tools/EventToolStore'
import { tools } from '@/lib/editor/tools'
import { cn } from '@/lib/utils'
import { TOOL_GROUPS } from '@/constants'
import { Check } from 'lucide-react'
import type { Tool } from '@/types'

type ToolGroup = {
  id: string
  name: string
  tools: typeof tools
  primaryTool: typeof tools[0]
  showActiveIcon: boolean // Whether to show the active tool's icon or a category icon
  categoryIcon?: React.ElementType // Fixed category icon if showActiveIcon is false
}

// Define tool group configurations
const TOOL_GROUP_CONFIGS: Record<string, { showActiveIcon: boolean; categoryIcon?: React.ElementType }> = {
  MARQUEE: { showActiveIcon: true }, // Show actual selection tool icon
  LASSO: { showActiveIcon: true },
  QUICK_SELECTION: { showActiveIcon: true },
  TYPE: { showActiveIcon: true }, // Show actual text tool icon
  BRUSH: { showActiveIcon: true }, // Show actual brush tool icon
  GRADIENT: { showActiveIcon: false }, // Category icon for gradients
  ERASER: { showActiveIcon: true },
  NAV: { showActiveIcon: true },
  EYEDROPPER: { showActiveIcon: true },
}

// Define default tools for each group (most commonly used)
const DEFAULT_TOOLS: Record<string, string> = {
  MARQUEE: 'marquee-rect',
  LASSO: 'lasso',
  QUICK_SELECTION: 'quick-selection',
  TYPE: 'type-horizontal',
  BRUSH: 'brush',
  GRADIENT: 'gradient',
  ERASER: 'eraser',
  NAV: 'hand',
  EYEDROPPER: 'eyedropper',
}

export function ToolPalette() {
  const toolStore = useService<EventToolStore>('ToolStore')
  const toolState = useEventToolStore()
  const activeTool = toolState.activeTool
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const paletteRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [hoverArea, setHoverArea] = useState<'button' | 'dropdown' | null>(null)
  
  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
  }, [])
  
  /**
   * Get the current tool for a group based on activeTool or defaults
   */
  const getCurrentGroupTool = (group: ToolGroup): Tool => {
    // If activeTool belongs to this group, find the corresponding UI tool
    if (activeTool && group.tools.some(t => t.id === activeTool.id)) {
      return group.tools.find(t => t.id === activeTool.id) || group.primaryTool
    }
    // Otherwise use default tool for this group
    const defaultToolId = DEFAULT_TOOLS[group.id]
    return group.tools.find(t => t.id === defaultToolId) || group.primaryTool
  }
  
  // Process all tools into groups and individual tools
  const { toolGroups, individualTools } = (() => {
    const processedToolIds = new Set<string>()
    const groups: ToolGroup[] = []
    const individual: typeof tools = []
    
    // Process tool groups first
    Object.entries(TOOL_GROUPS).forEach(([groupName, toolIds]) => {
      const groupTools = tools.filter(tool => (toolIds as readonly string[]).includes(tool.id))
      if (groupTools.length > 0) {
        groupTools.forEach(tool => processedToolIds.add(tool.id))
        
        const config = TOOL_GROUP_CONFIGS[groupName] || { showActiveIcon: true }
        const defaultToolId = DEFAULT_TOOLS[groupName]
        const primaryTool = groupTools.find(t => t.id === defaultToolId) || groupTools[0]
        
        groups.push({
          id: groupName,
          name: groupName,
          tools: groupTools,
          primaryTool,
          showActiveIcon: config.showActiveIcon,
          categoryIcon: config.categoryIcon
        })
      }
    })
    
    // Process remaining individual tools
    tools.forEach(tool => {
      if (!processedToolIds.has(tool.id)) {
        individual.push(tool)
      }
    })
    
    return { toolGroups: groups, individualTools: individual }
  })()
  
  // Register tools on mount
  useEffect(() => {
    tools.forEach(tool => {
      const category = tool.id.startsWith('ai-') ? 'ai' : 
                      tool.id.includes('select') || tool.id.includes('marquee') || tool.id.includes('lasso') ? 'selection' :
                      tool.id.includes('move') || tool.id.includes('rotate') || tool.id.includes('scale') || tool.id.includes('crop') ? 'transform' :
                      tool.id.includes('brush') || tool.id.includes('eraser') ? 'drawing' :
                      tool.id.includes('brightness') || tool.id.includes('contrast') || tool.id.includes('saturation') || tool.id.includes('hue') || tool.id.includes('exposure') ? 'adjustment' :
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
        setDropdownPosition(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout)
    }
  }, [hoverTimeout])
  
  const handleToolClick = async (toolId: string, isImplemented: boolean) => {
    if (!isImplemented) {
      alert('This tool is not implemented yet')
      return
    }
    
    // Simply activate the tool - this will update activeTool in store
    await toolStore.activateTool(toolId)
    
    // Close dropdown immediately after selection
    setExpandedGroup(null)
    setDropdownPosition(null)
    
    // Clear hover state
    setHoverArea(null)
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
  }

  const handleGroupClick = (groupId: string) => {
    const group = toolGroups.find(g => g.id === groupId)
    if (!group) return
    
    const currentTool = getCurrentGroupTool(group)
    handleToolClick(currentTool.id, currentTool.isImplemented)
  }

  const handleGroupHover = (groupId: string, buttonElement: HTMLButtonElement) => {
    const group = toolGroups.find(g => g.id === groupId)
    if (!group || group.tools.length <= 1) return
    
    setHoverArea('button')
    
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
    
    // Set new timeout for hover
    const timeout = setTimeout(() => {
      // Only open if still hovering the button area
      if (hoverArea === 'button') {
        const rect = buttonElement.getBoundingClientRect()
        setDropdownPosition({
          top: rect.top,
          left: rect.right + 8
        })
        setExpandedGroup(groupId)
      }
    }, 350)
    
    setHoverTimeout(timeout)
  }

  const handleGroupLeave = () => {
    setHoverArea(null)
    
    // Clear hover timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    
    // Close dropdown after small delay to allow moving to dropdown
    setTimeout(() => {
      if (hoverArea === null) {
        setExpandedGroup(null)
        setDropdownPosition(null)
      }
    }, 100)
  }

  const handleDropdownEnter = () => {
    setHoverArea('dropdown')
    // Clear any pending close timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
  }

  const handleDropdownLeave = () => {
    setHoverArea(null)
    // Immediately close dropdown
    setExpandedGroup(null)
    setDropdownPosition(null)
  }
  
  const renderIndividualTool = (tool: typeof tools[0]) => {
    const Icon = tool.icon
    const isActive = activeTool?.id === tool.id
    const isImplemented = tool.isImplemented
    
    return (
      <div key={tool.id} className="relative">
        <button
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md transition-all relative",
            isActive 
              ? "bg-tool-active text-tool-active-foreground shadow-sm" 
              : isImplemented
                ? "text-tool-inactive hover:bg-tool-background-hover hover:text-tool-hover"
                : "text-tool-inactive/50 cursor-not-allowed"
          )}
          onClick={() => handleToolClick(tool.id, isImplemented)}
        >
          <Icon className="w-5 h-5" />
        </button>
      </div>
    )
  }
  
  const renderToolGroup = (group: ToolGroup) => {
    const currentTool = getCurrentGroupTool(group)
    const isActive = activeTool?.id === currentTool.id
    const isImplemented = currentTool.isImplemented
    
    // Determine which icon to show
    const IconToShow = group.showActiveIcon ? currentTool.icon : (group.categoryIcon || currentTool.icon)
    
    return (
      <div key={group.id} className="relative">
        <button
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md transition-all relative",
            isActive 
              ? "bg-tool-active text-tool-active-foreground shadow-sm" 
              : isImplemented
                ? "text-tool-inactive hover:bg-tool-background-hover hover:text-tool-hover"
                : "text-tool-inactive/50 cursor-not-allowed"
          )}
          onClick={() => handleGroupClick(group.id)}
          onMouseEnter={(e) => handleGroupHover(group.id, e.currentTarget)}
          onMouseLeave={handleGroupLeave}
          disabled={!isImplemented}
        >
          <IconToShow className="w-5 h-5" />
        </button>
      </div>
    )
  }
  
  // Render dropdown as portal
  const renderDropdown = () => {
    if (!mounted || !expandedGroup || !dropdownPosition) return null
    
    const group = toolGroups.find(g => g.id === expandedGroup)
    if (!group || group.tools.length <= 1) return null
    
    const currentTool = getCurrentGroupTool(group)
    
    return createPortal(
      <div 
        className="fixed bg-popover text-popover-foreground border border-border rounded-lg shadow-xl min-w-[180px] p-1 animate-in slide-in-from-left-1 duration-200"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          zIndex: 50
        }}
        onMouseEnter={handleDropdownEnter}
        onMouseLeave={handleDropdownLeave}
      >
        {/* Group header */}
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-b border-border mb-1">
          {group.name}
        </div>
        
        {/* Tool options */}
        {group.tools.map(tool => {
          const ToolIcon = tool.icon
          const isToolActive = tool.id === activeTool?.id
          const isSelected = tool.id === currentTool.id
          
          return (
            <button
              key={tool.id}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 text-sm rounded transition-colors text-left",
                isToolActive 
                  ? "bg-tool-active text-tool-active-foreground" 
                  : tool.isImplemented
                    ? "text-popover-foreground hover:bg-tool-background-hover"
                    : "text-muted-foreground cursor-not-allowed opacity-50"
              )}
              onClick={() => handleToolClick(tool.id, tool.isImplemented)}
              disabled={!tool.isImplemented}
            >
              <ToolIcon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{tool.name}</span>
              {isSelected && (
                <Check className="w-3 h-3 text-primary" />
              )}
            </button>
          )
        })}
      </div>,
      document.body
    )
  }
  
  // Arrange tools in two columns
  const allTools = [...toolGroups, ...individualTools]
  const leftColumn = allTools.filter((_, index) => index % 2 === 0)
  const rightColumn = allTools.filter((_, index) => index % 2 === 1)
  
  return (
    <>
      <div ref={paletteRef} className="w-24 bg-background border-r border-border flex flex-col h-full overflow-hidden">
        <div className="flex-1 p-2 overflow-hidden">
          <div className="grid grid-cols-2 gap-1">
            {/* Left column */}
            <div className="space-y-1">
              {leftColumn.map(item => 
                'tools' in item ? renderToolGroup(item) : renderIndividualTool(item)
              )}
            </div>
            
            {/* Right column */}
            <div className="space-y-1">
              {rightColumn.map(item => 
                'tools' in item ? renderToolGroup(item) : renderIndividualTool(item)
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Render dropdown as portal */}
      {renderDropdown()}
    </>
  )
} 