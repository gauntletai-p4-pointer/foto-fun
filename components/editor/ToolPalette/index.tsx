'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useService } from '@/lib/core/AppInitializer'
import { EventToolStore, useEventToolStore } from '@/lib/store/tools/EventToolStore'
import { tools } from '@/lib/editor/tools'
import { cn } from '@/lib/utils'
import { TOOL_GROUPS } from '@/constants'
import { Check } from 'lucide-react'

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
  const [selectedGroupTools, setSelectedGroupTools] = useState<Record<string, string>>({})
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const paletteRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [pressTimeout, setPressTimeout] = useState<NodeJS.Timeout | null>(null)
  
  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Initialize selected tools with defaults
  useEffect(() => {
    const initialSelected: Record<string, string> = {}
    Object.entries(DEFAULT_TOOLS).forEach(([groupId, toolId]) => {
      initialSelected[groupId] = toolId
    })
    setSelectedGroupTools(initialSelected)
  }, [])
  
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
        const primaryToolId = selectedGroupTools[groupName] || defaultToolId || groupTools[0].id
        const primaryTool = groupTools.find(t => t.id === primaryToolId) || groupTools[0]
        
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
      if (pressTimeout) clearTimeout(pressTimeout)
    }
  }, [hoverTimeout, pressTimeout])
  
  const handleToolClick = async (toolId: string, isImplemented: boolean, groupId?: string) => {
    if (!isImplemented) {
      alert('This tool is not implemented yet')
      return
    }
    
    await toolStore.activateTool(toolId)
    
    if (groupId) {
      setSelectedGroupTools(prev => ({ ...prev, [groupId]: toolId }))
      setExpandedGroup(null) // Close dropdown after selection
      setDropdownPosition(null)
    }
  }
  
  const handleGroupClick = (groupId: string, activeToolId: string, isImplemented: boolean) => {
    const group = toolGroups.find(g => g.id === groupId)
    if (!group) return
    
    // Always activate the current tool on click
    handleToolClick(activeToolId, isImplemented, groupId)
  }

  const handleGroupHover = (groupId: string, buttonElement: HTMLButtonElement) => {
    const group = toolGroups.find(g => g.id === groupId)
    if (!group || group.tools.length <= 1) return
    
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
    
    // Set new timeout for hover
    const timeout = setTimeout(() => {
      const rect = buttonElement.getBoundingClientRect()
      setDropdownPosition({
        top: rect.top,
        left: rect.right + 8 // 8px gap
      })
      setExpandedGroup(groupId)
    }, 350) // 350ms hover delay
    
    setHoverTimeout(timeout)
  }

  const handleGroupLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
  }

  const handleGroupMouseDown = (groupId: string, buttonElement: HTMLButtonElement) => {
    const group = toolGroups.find(g => g.id === groupId)
    if (!group || group.tools.length <= 1) return
    
    // Set timeout for long press
    const timeout = setTimeout(() => {
      const rect = buttonElement.getBoundingClientRect()
      setDropdownPosition({
        top: rect.top,
        left: rect.right + 8 // 8px gap
      })
      setExpandedGroup(groupId)
    }, 300) // 300ms press delay
    
    setPressTimeout(timeout)
  }

  const handleGroupMouseUp = () => {
    if (pressTimeout) {
      clearTimeout(pressTimeout)
      setPressTimeout(null)
    }
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
          title={tool.name}
        >
          <Icon className="w-5 h-5" />
        </button>
      </div>
    )
  }
  
  const renderToolGroup = (group: ToolGroup) => {
    const isActive = group.tools.some(tool => tool.id === activeTool?.id)
    const hasMultipleTools = group.tools.length > 1
    const currentSelectedTool = selectedGroupTools[group.id] || group.primaryTool.id
    const activeGroupTool = group.tools.find(tool => tool.id === currentSelectedTool) || group.primaryTool
    const isExpanded = expandedGroup === group.id
    const isImplemented = activeGroupTool.isImplemented
    
    // Determine which icon to show
    const IconToShow = group.showActiveIcon ? activeGroupTool.icon : (group.categoryIcon || activeGroupTool.icon)
    
    const tooltipText = hasMultipleTools 
      ? `${activeGroupTool.name} (${group.name} - click for more)`
      : activeGroupTool.name
    
    return (
      <div key={group.id} className="relative">
        <button
          ref={(el) => {
            if (el && isExpanded) {
              // Update position if this button is expanded
              const rect = el.getBoundingClientRect()
              if (dropdownPosition?.top !== rect.top || dropdownPosition?.left !== rect.right + 8) {
                setDropdownPosition({
                  top: rect.top,
                  left: rect.right + 8
                })
              }
            }
          }}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md transition-all relative",
            isActive 
              ? "bg-tool-active text-tool-active-foreground shadow-sm" 
              : isImplemented
                ? "text-tool-inactive hover:bg-tool-background-hover hover:text-tool-hover"
                : "text-tool-inactive/50 cursor-not-allowed"
          )}
          onClick={() => handleGroupClick(group.id, activeGroupTool.id, isImplemented)}
          onMouseEnter={(e) => handleGroupHover(group.id, e.currentTarget)}
          onMouseLeave={handleGroupLeave}
          onMouseDown={(e) => handleGroupMouseDown(group.id, e.currentTarget)}
          onMouseUp={handleGroupMouseUp}
          disabled={!isImplemented}
          title={tooltipText}
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
    
    const currentSelectedTool = selectedGroupTools[group.id] || group.primaryTool.id
    
    return createPortal(
      <div 
        className="fixed bg-popover border border-border rounded-lg shadow-xl min-w-[180px] p-1 animate-in slide-in-from-left-1 duration-200"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          zIndex: 50,
          backgroundColor: 'hsl(var(--popover))'
        }}
        onMouseLeave={() => {
          setExpandedGroup(null)
          setDropdownPosition(null)
        }}
      >
        {/* Group header */}
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-b border-border mb-1">
          {group.name}
        </div>
        
        {/* Tool options */}
        {group.tools.map(tool => {
          const ToolIcon = tool.icon
          const isToolActive = tool.id === activeTool?.id
          const isSelected = tool.id === currentSelectedTool
          
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
              onClick={() => handleToolClick(tool.id, tool.isImplemented, group.id)}
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