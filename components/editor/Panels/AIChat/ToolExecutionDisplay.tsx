'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Check, X, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ToolExecution {
  toolName: string
  params: unknown
  description?: string
  confidence?: number
  status?: 'pending' | 'executing' | 'completed' | 'error'
  result?: unknown
  error?: string
}

interface ToolExecutionDisplayProps {
  executions: ToolExecution[]
  showConfidence?: boolean
}

export function ToolExecutionDisplay({ executions, showConfidence = true }: ToolExecutionDisplayProps) {
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set())
  
  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedTools)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedTools(newExpanded)
  }
  
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'executing':
        return <Loader2 className="w-3 h-3 animate-spin" />
      case 'completed':
        return <Check className="w-3 h-3 text-green-600" />
      case 'error':
        return <X className="w-3 h-3 text-red-600" />
      default:
        return null
    }
  }
  
  const formatValue = (value: unknown): string => {
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'string') return value
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    return JSON.stringify(value, null, 2)
  }
  
  return (
    <div className="space-y-2">
      {executions.map((execution, index) => {
        const isExpanded = expandedTools.has(index)
        
        return (
          <div key={index} className="border rounded-lg overflow-hidden">
            {/* Tool header */}
            <button
              onClick={() => toggleExpanded(index)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                
                <Badge 
                  variant="default" 
                  className="bg-blue-500 text-white hover:bg-blue-600"
                >
                  {execution.toolName}
                </Badge>
                
                {execution.description && (
                  <span className="text-sm text-muted-foreground">
                    {execution.description}
                  </span>
                )}
                
                {showConfidence && execution.confidence !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(execution.confidence * 100)}%
                  </Badge>
                )}
              </div>
              
              {getStatusIcon(execution.status)}
            </button>
            
            {/* Expandable content */}
            {isExpanded && (
              <div className="px-3 py-2 border-t bg-muted/20 space-y-3">
                {/* Parameters */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Parameters</p>
                  <div className="pl-3 space-y-1">
                    {execution.params && typeof execution.params === 'object' ? (
                      Object.entries(execution.params as Record<string, unknown>).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-xs">
                          <span className="font-medium text-muted-foreground">{key}:</span>
                          <span className="font-mono">{formatValue(value)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs font-mono">{formatValue(execution.params)}</span>
                    )}
                  </div>
                </div>
                
                {/* Result */}
                {execution.result !== undefined && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Result</p>
                    <div className="pl-3">
                      <pre className="text-xs font-mono overflow-auto max-h-32">
                        {formatValue(execution.result)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Error */}
                {execution.error && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-600">Error</p>
                    <div className="pl-3">
                      <p className="text-xs text-red-600">{execution.error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
} 