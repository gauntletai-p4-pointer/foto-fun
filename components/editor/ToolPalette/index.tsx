'use client'

import { useEffect } from 'react'
import { useToolStore } from '@/store/toolStore'
import { tools } from '@/lib/editor/tools'
import { cn } from '@/lib/utils'
import { TOOL_IDS } from '@/constants'

// Tool descriptions for better tooltips
const TOOL_DESCRIPTIONS: Record<string, string> = {
  [TOOL_IDS.MOVE]: 'Select and move layers or objects',
  [TOOL_IDS.MARQUEE_RECT]: 'Make rectangular selections',
  [TOOL_IDS.MARQUEE_ELLIPSE]: 'Make elliptical selections',
  [TOOL_IDS.LASSO]: 'Make freehand selections',
  [TOOL_IDS.MAGIC_WAND]: 'Select areas of similar color',
  [TOOL_IDS.QUICK_SELECTION]: 'Quickly select areas by painting',
  [TOOL_IDS.CROP]: 'Crop the image to a specific area',
  [TOOL_IDS.ROTATE]: 'Rotate the canvas or selection',
  [TOOL_IDS.FLIP]: 'Flip horizontally or vertically',
  [TOOL_IDS.RESIZE]: 'Resize the canvas or selection',
  [TOOL_IDS.BRUSH]: 'Paint with customizable brushes',
  [TOOL_IDS.EYEDROPPER]: 'Sample colors from the image',
  [TOOL_IDS.TYPE_HORIZONTAL]: 'Add horizontal text',
  [TOOL_IDS.TYPE_VERTICAL]: 'Add vertical text',
  [TOOL_IDS.TYPE_MASK]: 'Create a selection in the shape of text',
  [TOOL_IDS.TYPE_ON_PATH]: 'Add text along a path',
  [TOOL_IDS.BRIGHTNESS]: 'Adjust image brightness',
  [TOOL_IDS.CONTRAST]: 'Adjust image contrast',
  [TOOL_IDS.SATURATION]: 'Adjust color intensity',
  [TOOL_IDS.HUE]: 'Shift colors around the color wheel',
  [TOOL_IDS.EXPOSURE]: 'Adjust exposure levels',
  [TOOL_IDS.COLOR_TEMPERATURE]: 'Make image warmer or cooler',
  [TOOL_IDS.BLUR]: 'Apply blur effect',
  [TOOL_IDS.SHARPEN]: 'Sharpen image details',
  [TOOL_IDS.GRAYSCALE]: 'Convert to black and white',
  [TOOL_IDS.SEPIA]: 'Apply vintage sepia tone',
  [TOOL_IDS.INVERT]: 'Invert colors for negative effect',
  [TOOL_IDS.HAND]: 'Pan around the canvas',
  [TOOL_IDS.ZOOM]: 'Zoom in or out',
  [TOOL_IDS.AI_IMAGE_GENERATION]: 'Generate images with AI',
  [TOOL_IDS.AI_IMAGE_TRANSFORMATION]: 'Transform images with AI'
}

// Define tool groups for better organization
const TOOL_CATEGORIES = [
  {
    name: 'Selection',
    tools: [
      TOOL_IDS.MOVE,
      TOOL_IDS.MARQUEE_RECT,
      TOOL_IDS.MARQUEE_ELLIPSE,
      TOOL_IDS.LASSO,
      TOOL_IDS.MAGIC_WAND,
      TOOL_IDS.QUICK_SELECTION
    ]
  },
  {
    name: 'Transform',
    tools: [
      TOOL_IDS.CROP,
      TOOL_IDS.ROTATE,
      TOOL_IDS.FLIP,
      TOOL_IDS.RESIZE
    ]
  },
  {
    name: 'Drawing',
    tools: [
      TOOL_IDS.BRUSH,
      TOOL_IDS.EYEDROPPER
    ]
  },
  {
    name: 'Text',
    tools: [
      TOOL_IDS.TYPE_HORIZONTAL,
      TOOL_IDS.TYPE_VERTICAL,
      TOOL_IDS.TYPE_MASK,
      TOOL_IDS.TYPE_ON_PATH
    ]
  },
  {
    name: 'Adjustments',
    tools: [
      TOOL_IDS.BRIGHTNESS,
      TOOL_IDS.CONTRAST,
      TOOL_IDS.SATURATION,
      TOOL_IDS.HUE,
      TOOL_IDS.EXPOSURE,
      TOOL_IDS.COLOR_TEMPERATURE
    ]
  },
  {
    name: 'Filters',
    tools: [
      TOOL_IDS.BLUR,
      TOOL_IDS.SHARPEN,
      TOOL_IDS.GRAYSCALE,
      TOOL_IDS.SEPIA,
      TOOL_IDS.INVERT
    ]
  },
  {
    name: 'Navigation',
    tools: [
      TOOL_IDS.HAND,
      TOOL_IDS.ZOOM
    ]
  }
]

// Remove the HIDDEN_TOOLS array since we're showing all tools now
// const HIDDEN_TOOLS = [...]

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
  
  // Separate regular tools from AI tools
  const regularTools = tools.filter(tool => !tool.id.startsWith('ai-'))
  const aiTools = tools.filter(tool => tool.id.startsWith('ai-'))
  
  // Create a map of tools by ID for easy lookup
  const toolsById = new Map(regularTools.map(tool => [tool.id, tool]))
  
  return (
    <div className="w-14 bg-background border-r border-foreground/10 py-2">
      <div className="px-1">
        {TOOL_CATEGORIES.map((category, categoryIndex) => {
          const categoryTools = category.tools
            .map(toolId => toolsById.get(toolId))
            .filter(Boolean)
          
          if (categoryTools.length === 0) return null
          
          return (
            <div key={category.name}>
              {/* Add separator between categories (except first) */}
              {categoryIndex > 0 && (
                <div className="my-1.5 border-t border-foreground/10" />
              )}
              
              {/* Tool grid for this category */}
              <div className="grid grid-cols-2 gap-0.5">
                {categoryTools.map((tool) => {
                  if (!tool) return null
                  
                  const Icon = tool.icon
                  const isActive = activeTool === tool.id
                  const isImplemented = tool.isImplemented
                  const description = TOOL_DESCRIPTIONS[tool.id] || tool.name
                  
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
                      
                      {/* Enhanced tooltip */}
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1.5 bg-background text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-foreground/10 shadow-lg">
                        <div className="font-medium">{tool.name} {tool.shortcut ? `(${tool.shortcut})` : ''}</div>
                        <div className="text-[10px] text-foreground/60 mt-0.5">{description}</div>
                        {!isImplemented && <div className="text-yellow-500 text-[10px] mt-0.5">Coming soon</div>}
                      </div>
                    </button>
                  )
                })}
                
                {/* Add empty cells to complete the row if needed */}
                {categoryTools.length % 2 === 1 && <div className="w-6 h-6" />}
              </div>
            </div>
          )
        })}
        
        {/* AI Tools Section */}
        {aiTools.length > 0 && (
          <>
            {/* Separator with label */}
            <div className="my-2 border-t border-primary/30" />
            <div className="text-[10px] text-primary/70 text-center mb-1">AI Tools</div>
            
            {/* AI Tools grid */}
            <div className="grid grid-cols-2 gap-0.5">
              {aiTools.map((tool) => {
                const Icon = tool.icon
                const isActive = activeTool === tool.id
                const isImplemented = tool.isImplemented
                const description = TOOL_DESCRIPTIONS[tool.id] || tool.name
                
                return (
                  <button
                    key={tool.id}
                    data-tool-id={tool.id}
                    className={cn(
                      "w-6 h-6 flex items-center justify-center rounded transition-colors relative group",
                      "ring-1 ring-primary/20", // Visual distinction for AI tools
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : isImplemented
                          ? "hover:bg-primary/10 text-foreground/70 hover:text-foreground"
                          : "hover:bg-foreground/5 text-foreground/30 cursor-not-allowed"
                    )}
                    title={tool.shortcut ? `${tool.name} (${tool.shortcut})` : tool.name}
                    onClick={() => handleToolClick(tool.id, isImplemented)}
                  >
                    <Icon 
                      className="w-4 h-4" 
                    />
                    
                    {/* Enhanced tooltip */}
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1.5 bg-background text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-foreground/10 shadow-lg">
                      <div className="font-medium">{tool.name} {tool.shortcut ? `(${tool.shortcut})` : ''}</div>
                      <div className="text-[10px] text-foreground/60 mt-0.5">{description}</div>
                      <div className="text-primary text-[10px] mt-0.5">✨ AI-Powered</div>
                      {!isImplemented && <div className="text-yellow-500 text-[10px] mt-0.5">Coming soon</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
} 