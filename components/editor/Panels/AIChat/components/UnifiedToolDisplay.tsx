'use client'

import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

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
  
  return (
    <div className={cn(
      "rounded-lg overflow-hidden border"
    )}>
      {/* Tool header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1">
          {/* Expand/collapse icon - for chain items, use > as the indicator */}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
            <span className="text-sm text-muted-foreground truncate">
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
        <div className="px-3 py-2 border-t bg-muted/20 space-y-3">
          {/* Parameters */}
          {input && Object.keys(input).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Parameters</p>
              <div className="pl-3 space-y-1">
                {/* Special handling for Tool Chain steps */}
                {toolName === 'Tool Chain' && 'steps' in input && Array.isArray(input.steps) ? (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Steps: {input.steps.length}</span>
                    {(input.steps as Array<{ tool: string; params?: unknown }>).map((step, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        {idx + 1}. {step.tool}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Regular parameter display
                  Object.entries(input).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="font-medium text-muted-foreground">{key}:</span>
                      <span className="font-mono">{formatValue(value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Result - show for all successful operations */}
          {state === 'output-available' && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Result</p>
              <div className="pl-3">
                {output && typeof output === 'object' && 'message' in output ? (
                  <p className="text-xs">{String(output.message)}</p>
                ) : output && typeof output === 'object' && 'success' in output ? (
                  <p className="text-xs text-green-600">Operation completed successfully</p>
                ) : output ? (
                  <pre className="text-xs font-mono overflow-auto max-h-32">
                    {formatValue(output)}
                  </pre>
                ) : (
                  <p className="text-xs text-green-600">Operation completed successfully</p>
                )}
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