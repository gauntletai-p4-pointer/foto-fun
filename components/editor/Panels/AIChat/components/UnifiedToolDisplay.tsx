'use client'

import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// Define important fields for different tool categories
const IMPORTANT_FIELDS: Record<string, string[]> = {
  // Adjustment tools
  brightness: ['adjustment', 'previousValue', 'newValue', 'affectedImages'],
  contrast: ['adjustment', 'previousValue', 'newValue', 'affectedImages'],
  saturation: ['adjustment', 'previousValue', 'newValue', 'affectedImages'],
  exposure: ['adjustment', 'affectedImages'],
  hue: ['previousValue', 'newValue', 'affectedImages'],
  colorTemperature: ['adjustment'],
  
  // Transform tools
  resize: ['mode', 'dimensions', 'scale'],
  rotate: ['angle'],
  flip: ['horizontal', 'vertical'],
  crop: ['newDimensions', 'scale'],
  
  // Filter tools
  blur: ['amount'],
  sharpen: ['amount'],
  grayscale: ['enabled'],
  invert: ['enabled'],
  sepia: ['intensity'],
  
  // Creation tools
  addText: ['textId', 'bounds'],
  generateImage: ['imageUrl', 'cost', 'metadata'],
  
  // Analysis tools
  analyzeCanvas: ['analysis'],
  
  // Selection tools
  canvasSelectionManager: ['action', 'selectedCount', 'objectInfo'],
  
  // Chain execution
  executeToolChain: ['chainId', 'results', 'totalTime']
}

// Helper to determine if a field is important for a tool
const isImportantField = (toolName: string, fieldName: string): boolean => {
  // Normalize tool name (remove spaces, lowercase)
  const normalizedTool = toolName.toLowerCase().replace(/\s+/g, '')
  
  // Check if we have specific important fields for this tool
  const importantFields = IMPORTANT_FIELDS[normalizedTool]
  if (importantFields) {
    return importantFields.includes(fieldName)
  }
  
  // For unknown tools, show common important fields
  const commonImportantFields = ['adjustment', 'amount', 'dimensions', 'angle', 'scale', 'enabled', 'intensity']
  return commonImportantFields.includes(fieldName)
}

// Props for the unified display
interface UnifiedToolDisplayProps {
  toolName: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  errorText?: string
  isPartOfChain?: boolean  // Used by parent components to indicate chain membership
  showConfidence?: boolean
  confidence?: number
  description?: string
}

export function UnifiedToolDisplay({
  toolName,
  state,
  input,
  output,
  errorText,
  // isPartOfChain is intentionally not destructured as it's only used by parent components
  showConfidence = true,
  confidence,
  description
}: UnifiedToolDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Determine status icon
  const getStatusIcon = () => {
    switch (state) {
      case 'input-streaming':
        return <Loader2 className="w-3 h-3 animate-spin" />
      case 'output-available':
        return <Check className="w-3 h-3 text-green-600" />
      case 'output-error':
        return <X className="w-3 h-3 text-red-600" />
      default:
        return null
    }
  }
  
  // Format parameter values
  const formatValue = (value: unknown): string => {
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'string') return value
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    return JSON.stringify(value, null, 2)
  }
  
  // Format field names nicely
  const formatFieldName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }
  
  return (
    <div className={cn(
      "rounded-lg overflow-hidden border"
    )}>
      {/* Tool header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-foreground/10 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1">
          {/* Expand/collapse icon - for chain items, use > as the indicator */}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-foreground/60" />
          ) : (
            <ChevronRight className="w-4 h-4 text-foreground/60" />
          )}
          
          {/* Tool name badge - consistent blue for all tools */}
          <Badge 
            variant="default" 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {toolName}
          </Badge>
          
          {/* Description */}
          {description && (
            <span className="text-sm text-foreground/60 truncate">
              {description}
            </span>
          )}
          
          {/* Confidence score */}
          {showConfidence && confidence !== undefined && (
            <Badge variant="outline" className="text-xs">
              {Math.round(confidence * 100)}%
            </Badge>
          )}
        </div>
        
        {/* Status icon */}
        {getStatusIcon()}
      </button>
      
      {/* Expandable content */}
      {isExpanded && (
        <div className="px-3 py-2 border-t bg-foreground/5 space-y-3">
          {/* Parameters */}
          {input && Object.keys(input).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground/60">Parameters</p>
              <div className="pl-3 space-y-1">
                {/* Special handling for Tool Chain steps */}
                {toolName === 'Tool Chain' && 'steps' in input && Array.isArray(input.steps) ? (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-foreground/60">Steps: {input.steps.length}</span>
                    {(input.steps as Array<{ tool: string; params?: unknown }>).map((step, idx) => (
                      <div key={idx} className="text-xs text-foreground/60">
                        {idx + 1}. {step.tool}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Regular parameter display
                  Object.entries(input).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="font-medium text-foreground/60">{key}:</span>
                      <span className="font-mono">{formatValue(value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Result - show for all successful operations */}
          {state === 'output-available' && output && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground/60">Result</p>
              <div className="pl-3 space-y-1">
                {(() => {
                  // Check for new standardized format
                  if ('summary' in output && output.summary) {
                    return (
                      <>
                        <p className="text-xs">{String(output.summary)}</p>
                        {output.details && typeof output.details === 'object' && (
                          <div className="mt-1 space-y-1">
                            {Object.entries(output.details).map(([key, value]) => (
                              <div key={key} className="flex gap-2 text-xs">
                                <span className="font-medium text-foreground/60">{formatFieldName(key)}:</span>
                                <span className="font-mono">
                                  {typeof value === 'object' && value !== null
                                    ? JSON.stringify(value, null, 2)
                                    : formatValue(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  }
                  
                  // Legacy format with message
                  if ('message' in output && output.message) {
                    const importantFields: Array<[string, unknown]> = []
                    
                    // Collect important fields for this tool
                    Object.entries(output).forEach(([key, value]) => {
                      if (key !== 'success' && key !== 'message' && key !== 'targetingMode') {
                        if (isImportantField(toolName, key)) {
                          importantFields.push([key, value])
                        }
                      }
                    })
                    
                    return (
                      <>
                        <p className="text-xs">{String(output.message)}</p>
                        {importantFields.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {importantFields.map(([key, value]) => (
                              <div key={key} className="flex gap-2 text-xs">
                                <span className="font-medium text-foreground/60">{formatFieldName(key)}:</span>
                                <span className="font-mono">
                                  {typeof value === 'object' && value !== null
                                    ? JSON.stringify(value, null, 2)
                                    : formatValue(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  }
                  
                  // No message field - show important fields only
                  const importantFields: Array<[string, unknown]> = []
                  
                  Object.entries(output).forEach(([key, value]) => {
                    if (key !== 'success' && key !== 'targetingMode') {
                      if (isImportantField(toolName, key)) {
                        importantFields.push([key, value])
                      }
                    }
                  })
                  
                  if (importantFields.length > 0) {
                    return (
                      <div className="space-y-1">
                        {importantFields.map(([key, value]) => (
                          <div key={key} className="flex gap-2 text-xs">
                            <span className="font-medium text-foreground/60">{formatFieldName(key)}:</span>
                            <span className="font-mono">
                              {typeof value === 'object' && value !== null
                                ? JSON.stringify(value, null, 2)
                                : formatValue(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  
                  // Fallback
                  return <p className="text-xs text-green-600">Operation completed successfully</p>
                })()}
              </div>
            </div>
          )}
          
          {/* Error */}
          {errorText && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-600">Error</p>
              <div className="pl-3">
                <p className="text-xs text-red-600">{errorText}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 