'use client'

import { useEffect, useState, useRef } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { EventToolStore, useEventToolStore } from '@/lib/store/tools/EventToolStore'
import { tools } from '@/lib/editor/tools'
import { cn } from '@/lib/utils'
import { TOOL_GROUPS } from '@/constants'
import { ChevronRight, Sparkles, Palette, Brain, Wand2 } from 'lucide-react'

type ToolGroup = {
  id: string
  name: string
  tools: typeof tools
  primaryTool: typeof tools[0]
  defaultToolId?: string // Explicitly set default tool
}

type ToolCategory = {
  id: string
  name: string
  icon?: React.ReactNode
  groups: ToolGroup[]
  tools: typeof tools
}

// Define default tools for each group (most commonly used)
const DEFAULT_TOOLS: Record<string, string> = {
  MARQUEE: 'marquee-rect', // Rectangle is more common than ellipse
  LASSO: 'lasso', // Standard lasso is default
  QUICK_SELECTION: 'quick-selection', // Quick selection over magic wand
  TYPE: 'type-horizontal', // Horizontal text is most common
  BRUSH: 'brush', // Standard brush
  GRADIENT: 'gradient', // Gradient tool
  ERASER: 'eraser', // Standard eraser
  NAV: 'hand', // Hand tool for navigation
  EYEDROPPER: 'eyedropper', // Color picker
}

export function ToolPalette() {
  const toolStore = useService<EventToolStore>('ToolStore')
  const toolState = useEventToolStore()
  const activeTool = toolState.activeTool
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [selectedGroupTools, setSelectedGroupTools] = useState<Record<string, string>>({})
  const [showAITools, setShowAITools] = useState(false)
  const [recentlyActivatedGroup, setRecentlyActivatedGroup] = useState<string | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const paletteRef = useRef<HTMLDivElement>(null)
  const groupActivationTimer = useRef<NodeJS.Timeout | null>(null)
  
  // Initialize selected tools with defaults
  useEffect(() => {
    const initialSelected: Record<string, string> = {}
    Object.entries(DEFAULT_TOOLS).forEach(([groupId, toolId]) => {
      initialSelected[groupId] = toolId
    })
    setSelectedGroupTools(initialSelected)
  }, [])
  
  // Organize tools into categories
  const categories: ToolCategory[] = [
    {
      id: 'selection',
      name: 'Selection',
      groups: [],
      tools: []
    },
    {
      id: 'transform',
      name: 'Transform',
      groups: [],
      tools: []
    },
    {
      id: 'drawing',
      name: 'Drawing',
      groups: [],
      tools: []
    },
    {
      id: 'text',
      name: 'Text',
      groups: [],
      tools: []
    },
    {
      id: 'adjustments',
      name: 'Adjustments',
      groups: [],
      tools: []
    },
    {
      id: 'filters',
      name: 'Filters',
      groups: [],
      tools: []
    },
    {
      id: 'navigation',
      name: 'Navigation',
      groups: [],
      tools: []
    }
  ]
  
  // AI tool categories
  const aiCategories: ToolCategory[] = [
    {
      id: 'ai-generation',
      name: 'AI Generation',
      icon: <Sparkles className="w-3 h-3" />,
      groups: [],
      tools: []
    },
    {
      id: 'ai-enhancement',
      name: 'AI Enhancement',
      icon: <Wand2 className="w-3 h-3" />,
      groups: [],
      tools: []
    },
    {
      id: 'ai-selection',
      name: 'AI Selection',
      icon: <Brain className="w-3 h-3" />,
      groups: [],
      tools: []
    },
    {
      id: 'ai-creative',
      name: 'AI Creative',
      icon: <Palette className="w-3 h-3" />,
      groups: [],
      tools: []
    }
  ]
  
  // Process tools and organize them
  const processedToolIds = new Set<string>()
  
  // Process tool groups
  Object.entries(TOOL_GROUPS).forEach(([groupName, toolIds]) => {
    const groupTools = tools.filter(tool => (toolIds as readonly string[]).includes(tool.id))
    if (groupTools.length > 0) {
      groupTools.forEach(tool => processedToolIds.add(tool.id))
      
      // Use default tool if defined, otherwise use selected or first
      const defaultToolId = DEFAULT_TOOLS[groupName]
      const primaryToolId = defaultToolId || selectedGroupTools[groupName] || groupTools[0].id
      const primaryTool = groupTools.find(t => t.id === primaryToolId) || groupTools[0]
      
      const group: ToolGroup = {
        id: groupName,
        name: groupName,
        tools: groupTools,
        primaryTool,
        defaultToolId
      }
      
      // Assign group to appropriate category
      const firstTool = groupTools[0]
      if (firstTool.id.includes('marquee') || firstTool.id.includes('lasso') || firstTool.id.includes('wand')) {
        categories[0].groups.push(group) // Selection
      } else if (firstTool.id.includes('move') || firstTool.id.includes('crop') || firstTool.id.includes('rotate')) {
        categories[1].groups.push(group) // Transform
      } else if (firstTool.id.includes('brush') || firstTool.id.includes('eraser') || firstTool.id.includes('gradient')) {
        categories[2].groups.push(group) // Drawing
      } else if (firstTool.id.includes('type')) {
        categories[3].groups.push(group) // Text
      } else if (firstTool.id.includes('hand') || firstTool.id.includes('zoom')) {
        categories[6].groups.push(group) // Navigation
      }
    }
  })
  
  // Process ungrouped tools
  tools.forEach(tool => {
    if (!processedToolIds.has(tool.id) && !tool.id.startsWith('ai-')) {
      // Categorize ungrouped tools
      if (tool.id.includes('select') || tool.id.includes('marquee') || tool.id.includes('lasso') || tool.id.includes('wand')) {
        categories[0].tools.push(tool) // Selection
      } else if (tool.id.includes('move') || tool.id.includes('crop') || tool.id.includes('rotate') || tool.id.includes('resize') || tool.id.includes('flip')) {
        categories[1].tools.push(tool) // Transform
      } else if (tool.id.includes('brush') || tool.id.includes('eraser') || tool.id.includes('gradient')) {
        categories[2].tools.push(tool) // Drawing
      } else if (tool.id.includes('type')) {
        categories[3].tools.push(tool) // Text
      } else if (tool.id.includes('brightness') || tool.id.includes('contrast') || tool.id.includes('saturation') || tool.id.includes('hue') || tool.id.includes('exposure')) {
        categories[4].tools.push(tool) // Adjustments
      } else if (tool.id.includes('blur') || tool.id.includes('sharpen') || tool.id.includes('grayscale') || tool.id.includes('invert') || tool.id.includes('vintage')) {
        categories[5].tools.push(tool) // Filters
      } else if (tool.id.includes('hand') || tool.id.includes('zoom') || tool.id.includes('eyedropper')) {
        categories[6].tools.push(tool) // Navigation
      }
    }
  })
  
  // Process AI tools
  tools.filter(tool => tool.id.startsWith('ai-')).forEach(tool => {
    if (tool.id.includes('generation') || tool.id.includes('variation') || tool.id.includes('outpainting')) {
      aiCategories[0].tools.push(tool) // AI Generation
    } else if (tool.id.includes('background') || tool.id.includes('face') || tool.id.includes('inpainting') || tool.id.includes('magic-eraser')) {
      aiCategories[1].tools.push(tool) // AI Enhancement
    } else if (tool.id.includes('semantic') || tool.id.includes('smart-selection')) {
      aiCategories[2].tools.push(tool) // AI Selection
    } else if (tool.id.includes('prompt-brush') || tool.id.includes('style-transfer') || tool.id.includes('prompt-adjustment')) {
      aiCategories[3].tools.push(tool) // AI Creative
    }
  })
  
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
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Auto-close expanded group after a delay when a tool is selected
  useEffect(() => {
    if (recentlyActivatedGroup) {
      groupActivationTimer.current = setTimeout(() => {
        setExpandedGroup(null)
        setRecentlyActivatedGroup(null)
      }, 3000) // Close after 3 seconds
      
      return () => {
        if (groupActivationTimer.current) {
          clearTimeout(groupActivationTimer.current)
        }
      }
    }
  }, [recentlyActivatedGroup])
  
  const handleToolClick = async (toolId: string, isImplemented: boolean, groupId?: string) => {
    if (!isImplemented) {
      alert('This tool is not implemented yet')
      return
    }
    
    await toolStore.activateTool(toolId)
    
    if (groupId) {
      setSelectedGroupTools(prev => ({ ...prev, [groupId]: toolId }))
      // Don't immediately close, let the auto-close timer handle it
      setRecentlyActivatedGroup(groupId)
    }
  }
  
  const handleGroupMouseDown = (groupId: string) => {
    longPressTimer.current = setTimeout(() => {
      setExpandedGroup(groupId)
    }, 300)
  }
  
  const handleGroupMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  
  const handleGroupMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  
  const handleGroupContextMenu = (e: React.MouseEvent, groupId: string) => {
    e.preventDefault()
    setExpandedGroup(expandedGroup === groupId ? null : groupId)
  }
  
  const renderTool = (tool: typeof tools[0], isInGroup = false, groupId?: string, isDefault = false) => {
    const Icon = tool.icon
    const isActive = activeTool?.id === tool.id
    const isImplemented = tool.isImplemented
    const isAI = tool.id.startsWith('ai-')
    
    return (
      <div key={tool.id} className="relative group">
        <button
          className={cn(
            "relative flex items-center justify-center rounded-md transition-all",
            isInGroup ? "w-full h-8 px-2 gap-2 justify-start" : "w-10 h-10",
            isActive 
              ? "bg-primary text-primary-foreground shadow-md" 
              : isImplemented
                ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                : "hover:bg-muted/50 text-muted-foreground/50 cursor-not-allowed",
            isAI && "ring-1 ring-primary/20"
          )}
          onClick={() => handleToolClick(tool.id, isImplemented, groupId)}
        >
          <Icon className={cn("flex-shrink-0", isInGroup ? "w-4 h-4" : "w-5 h-5")} />
          {isInGroup && (
            <>
              <span className="text-xs whitespace-nowrap flex-1">{tool.name}</span>
              {isDefault && (
                <span className="text-[10px] text-muted-foreground">default</span>
              )}
            </>
          )}
          {isAI && !isInGroup && (
            <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-primary" />
          )}
        </button>
        
        {/* Simple tooltip */}
        {!isInGroup && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-sm">
            <p>{tool.name}</p>
            {tool.shortcut && (
              <kbd className="text-[10px] text-muted-foreground">{tool.shortcut}</kbd>
            )}
            {isAI && <span className="text-[10px] text-primary">AI-Powered</span>}
          </div>
        )}
      </div>
    )
  }
  
  const renderToolGroup = (group: ToolGroup) => {
    const isActive = group.tools.some(tool => tool.id === activeTool?.id)
    const hasMultipleTools = group.tools.length > 1
    const activeGroupTool = group.tools.find(tool => tool.id === activeTool?.id) || group.primaryTool
    const Icon = activeGroupTool.icon
    const isExpanded = expandedGroup === group.id
    
    const handleGroupClick = (e: React.MouseEvent) => {
      if (hasMultipleTools) {
        // Always activate the default/primary tool
        handleToolClick(activeGroupTool.id, activeGroupTool.isImplemented, group.id)
        
        // Also expand the group to show options
        setExpandedGroup(isExpanded ? null : group.id)
        
        // Clear the auto-close timer if clicking again
        if (groupActivationTimer.current) {
          clearTimeout(groupActivationTimer.current)
        }
      } else {
        // Single tool, just activate it
        handleToolClick(activeGroupTool.id, activeGroupTool.isImplemented, group.id)
      }
    }
    
    return (
      <div key={group.id} className="relative group">
        <button
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md transition-all relative",
            isActive 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "hover:bg-muted text-muted-foreground hover:text-foreground",
            isExpanded && "ring-1 ring-primary/50"
          )}
          onClick={handleGroupClick}
          onMouseDown={() => handleGroupMouseDown(group.id)}
          onMouseUp={handleGroupMouseUp}
          onMouseLeave={handleGroupMouseLeave}
          onContextMenu={(e) => handleGroupContextMenu(e, group.id)}
        >
          <Icon className="w-5 h-5" />
          {hasMultipleTools && (
            <ChevronRight className={cn(
              "absolute -bottom-1 -right-1 w-3 h-3 opacity-60 transition-transform",
              isExpanded && "rotate-90"
            )} />
          )}
        </button>
        
        {/* Tooltip */}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-sm">
          <p>{activeGroupTool.name}</p>
          {activeGroupTool.shortcut && (
            <p className="text-[10px] text-muted-foreground">{activeGroupTool.shortcut}</p>
          )}
          {hasMultipleTools && (
            <p className="text-[10px] text-muted-foreground">Click for more options</p>
          )}
        </div>
        
        {isExpanded && (
          <div className="absolute left-full ml-2 top-0 bg-popover border rounded-lg shadow-lg z-50 min-w-[180px] p-1">
            {group.tools.map(tool => renderTool(
              tool, 
              true, 
              group.id,
              tool.id === group.defaultToolId
            ))}
          </div>
        )}
      </div>
    )
  }
  
  const renderCategory = (category: ToolCategory, isAI = false) => {
    const hasContent = category.groups.length > 0 || category.tools.length > 0
    if (!hasContent) return null
    
    return (
      <div key={category.id} className="space-y-1">
        {isAI && (
          <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
            {category.icon}
            <span>{category.name}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1">
          {category.groups.map(group => renderToolGroup(group))}
          {category.tools.map(tool => renderTool(tool))}
        </div>
      </div>
    )
  }
  
  return (
    <div ref={paletteRef} className="w-24 bg-background border-r flex flex-col h-full">
      {/* Traditional Tools Section */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {categories.map(category => renderCategory(category))}
      </div>
      
      {/* AI Tools Toggle */}
      <div className="border-t p-2">
        <button
          onClick={() => setShowAITools(!showAITools)}
          className={cn(
            "w-full h-10 flex items-center justify-center gap-2 rounded-md transition-all",
            "bg-gradient-to-r from-purple-500/10 to-blue-500/10",
            "hover:from-purple-500/20 hover:to-blue-500/20",
            "text-foreground font-medium text-sm",
            showAITools && "ring-2 ring-primary"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Tools</span>
        </button>
      </div>
      
      {/* AI Tools Panel */}
      {showAITools && (
        <div className="absolute bottom-0 left-full ml-0 w-64 bg-background border rounded-tr-lg rounded-br-lg shadow-xl z-50 p-3 space-y-3 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI-Powered Tools
            </h3>
            <button
              onClick={() => setShowAITools(false)}
              className="text-muted-foreground hover:text-foreground text-xl"
            >
              ×
            </button>
          </div>
          
          {aiCategories.map(category => (
            <div key={category.id}>
              {renderCategory(category, true)}
            </div>
          ))}
          
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p>💡 Tip: AI tools use advanced models to enhance your workflow</p>
          </div>
        </div>
      )}
    </div>
  )
} 