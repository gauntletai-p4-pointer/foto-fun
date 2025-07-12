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
  
  const getStatusIcon = (status: ToolExecution['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-3 h-3 text-success" />
      case 'error':
        return <X className="w-3 h-3 text-error" />
      case 'executing':
        return <Loader2 className="w-3 h-3 animate-spin text-primary" />
      case 'pending':
        return <Loader2 className="w-3 h-3 text-foreground/40" />
      default:
        return <Loader2 className="w-3 h-3 animate-spin text-primary" />
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
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-foreground/10 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-foreground/60" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-foreground/60" />
                )}
                
                <Badge 
                  variant="default" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {execution.toolName}
                </Badge>
                
                {execution.description && (
                  <span className="text-sm text-foreground/60">
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
              <div className="px-3 py-2 border-t bg-foreground/5 space-y-3">
                {/* Parameters */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground/60">Parameters</p>
                  <div className="pl-3 space-y-1">
                    {execution.params && typeof execution.params === 'object' ? (
                      Object.entries(execution.params as Record<string, unknown>).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-xs">
                          <span className="font-medium text-foreground/60">{key}:</span>
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
                    <p className="text-xs font-medium text-foreground/60">Result</p>
                    <div className="pl-3">
                      <pre className="text-xs font-mono overflow-auto max-h-32">
                        {formatValue(execution.result)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Error */}
                {execution.error && (
                  <div className="mt-2 p-2 bg-error/10 rounded border border-error/20">
                    <p className="text-xs font-medium text-error">Error</p>
                    <pre className="text-xs text-error/80 whitespace-pre-wrap mt-1">
                      {execution.error}
                    </pre>
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