'use client'

import { Bot, Brain, Cpu, Route, Settings, Zap, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type AgentStatusType = 
  | 'analyzing-prompt'
  | 'routing-decision'
  | 'planning-steps'
  | 'executing-tool'
  | 'evaluating-result'
  | 'generating-response'

export interface AgentStatus {
  type: AgentStatusType
  message: string
  details?: string
  timestamp: string
  confidence?: number
  approvalRequired?: boolean
  approvalThreshold?: number
  toolName?: string
}

const statusConfig: Record<AgentStatusType, { icon: React.ElementType; color: string; label: string }> = {
  'analyzing-prompt': { icon: Brain, color: 'text-primary', label: 'Analyzing' },
  'routing-decision': { icon: Route, color: 'text-primary', label: 'Routing' },
  'planning-steps': { icon: Settings, color: 'text-warning', label: 'Planning' },
  'executing-tool': { icon: Cpu, color: 'text-success', label: 'Executing' },
  'evaluating-result': { icon: Zap, color: 'text-primary', label: 'Evaluating' },
  'generating-response': { icon: Bot, color: 'text-primary', label: 'Responding' }
}

interface ConfidenceDisplayProps {
  confidence: number
  threshold?: number
  showThreshold?: boolean
}

function ConfidenceDisplay({ confidence, threshold = 0.7 }: ConfidenceDisplayProps) {
  const percentage = Math.round(confidence * 100)
  const isAboveThreshold = confidence >= threshold
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-foreground/10 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            isAboveThreshold ? 'bg-success' : 'bg-warning'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn(
        'text-xs font-medium',
        isAboveThreshold ? 'text-success' : 'text-warning'
      )}>
        {percentage}%
      </span>
    </div>
  )
}

function ApprovalIndicator({ required, confidence, threshold }: { 
  required: boolean
  confidence?: number
  threshold?: number 
}) {
  if (required && confidence !== undefined && threshold !== undefined) {
    const isAboveThreshold = confidence >= threshold
    return (
      <Badge variant="outline" className={cn(
        "text-xs gap-1",
        isAboveThreshold ? "border-success text-success" : "border-warning text-warning"
      )}>
        <AlertTriangle className="w-3 h-3" />
        {isAboveThreshold ? 'Auto-approved' : 'Needs approval'}
      </Badge>
    )
  }
  
  return (
    <Badge variant="outline" className="text-xs gap-1 border-success text-success">
      <CheckCircle className="w-3 h-3" />
      Approved
    </Badge>
  )
}

export function AgentStatusPart({ status }: { status: AgentStatus }) {
  const config = statusConfig[status.type]
  const Icon = config.icon
  
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg bg-foreground/10 text-sm">
      <div className={cn("mt-0.5", config.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium">{config.label}</span>
              {status.toolName && (
                <Badge variant="secondary" className="text-xs">
                  {status.toolName}
                </Badge>
              )}
            </div>
            <p className="text-foreground/60">{status.message}</p>
            {status.details && (
              <p className="text-xs text-foreground/60">{status.details}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-foreground/60">
              {new Date(status.timestamp).toLocaleTimeString()}
            </span>
            {status.approvalRequired !== undefined && (
              <ApprovalIndicator 
                required={status.approvalRequired}
                confidence={status.confidence}
                threshold={status.approvalThreshold}
              />
            )}
          </div>
        </div>
        
        {status.confidence !== undefined && (
          <ConfidenceDisplay 
            confidence={status.confidence}
            threshold={status.approvalThreshold}
            showThreshold={status.approvalThreshold !== undefined}
          />
        )}
      </div>
    </div>
  )
} 