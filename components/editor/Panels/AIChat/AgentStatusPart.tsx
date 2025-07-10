'use client'

import { Bot, Brain, Cpu, Route, Settings, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
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
  'routing-decision': { icon: Route, color: 'text-purple-500', label: 'Routing' },
  'planning-steps': { icon: Settings, color: 'text-amber-500', label: 'Planning' },
  'executing-tool': { icon: Cpu, color: 'text-green-500', label: 'Executing' },
  'evaluating-result': { icon: Zap, color: 'text-indigo-500', label: 'Evaluating' },
  'generating-response': { icon: Bot, color: 'text-pink-500', label: 'Responding' }
}

interface ConfidenceDisplayProps {
  confidence: number
  threshold?: number
  showThreshold?: boolean
}

function ConfidenceDisplay({ confidence, threshold = 0.8, showThreshold = true }: ConfidenceDisplayProps) {
  const percentage = Math.round(confidence * 100)
  const isAboveThreshold = confidence >= threshold
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Confidence:</span>
        <div className="flex items-center gap-1">
          <Progress 
            value={percentage} 
            className="h-1.5 w-20"
            indicatorClassName={cn(
              isAboveThreshold ? 'bg-green-500' : 'bg-amber-500'
            )}
          />
          <span className={cn(
            "text-xs font-medium",
            isAboveThreshold ? 'text-green-600' : 'text-amber-600'
          )}>
            {percentage}%
          </span>
        </div>
      </div>
      {showThreshold && (
        <div className="text-xs text-muted-foreground">
          Approval threshold: {Math.round(threshold * 100)}%
        </div>
      )}
    </div>
  )
}

interface ApprovalIndicatorProps {
  required: boolean
  confidence?: number
  threshold?: number
}

function ApprovalIndicator({ required, confidence, threshold }: ApprovalIndicatorProps) {
  if (required) {
    return (
      <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600">
        <AlertTriangle className="w-3 h-3" />
        Approval Required
      </Badge>
    )
  }
  
  if (confidence && threshold && confidence >= threshold) {
    return (
      <Badge variant="outline" className="text-xs gap-1 border-green-500 text-green-600">
        <CheckCircle2 className="w-3 h-3" />
        Auto-approved
      </Badge>
    )
  }
  
  return null
}

export function AgentStatusPart({ status }: { status: AgentStatus }) {
  const config = statusConfig[status.type]
  const Icon = config.icon
  
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg bg-muted/50 text-sm">
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
            <p className="text-muted-foreground">{status.message}</p>
            {status.details && (
              <p className="text-xs text-muted-foreground">{status.details}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">
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