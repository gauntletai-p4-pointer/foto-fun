'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Brain, CheckCircle2, AlertTriangle, Clock, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AgentWorkflowDisplayProps {
  workflow: {
    description: string
    steps: Array<{
      toolName: string
      params: unknown
      description: string
      confidence: number
    }>
    agentType: string
    totalSteps: number
    reasoning: string
  }
  agentStatus: {
    confidence: number
    approvalRequired: boolean
    threshold: number
  }
  statusUpdates: Array<{
    type: string
    message: string
    details?: string
    timestamp: string
  }>
  showSettings: {
    showConfidenceScores: boolean
    showApprovalDecisions: boolean
    showEducationalContent: boolean
  }
}

export function AgentWorkflowDisplay({ 
  workflow, 
  agentStatus, 
  statusUpdates,
  showSettings 
}: AgentWorkflowDisplayProps) {
  const [showStatusUpdates, setShowStatusUpdates] = useState(false)
  
  const thresholdPercentage = Math.round(agentStatus.threshold * 100)
  
  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border w-full">
      {/* Title - First Row */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="font-medium text-sm">Agent Workflow</span>
      </div>
      
      {/* Agent Type and Status - Second Row */}
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
          {workflow.agentType}
        </Badge>
        
        {showSettings.showApprovalDecisions && (
          <>
            {agentStatus.approvalRequired ? (
              <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                Approval
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1 border-green-500 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                Auto
              </Badge>
            )}
          </>
        )}
      </div>
      
      {/* Workflow Description */}
      <div className="text-sm text-muted-foreground">
        {workflow.description}
      </div>
      
      {/* Planned Steps */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium">Planned Steps ({workflow.totalSteps})</span>
        </div>
        
        <div className="space-y-1">
          {workflow.steps.map((step, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-muted-foreground flex-shrink-0">{idx + 1}.</span>
                <Badge variant="default" className="bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                  {step.toolName}
                </Badge>
              </div>
              
              {showSettings.showConfidenceScores && (
                <Badge 
                  variant={step.confidence >= agentStatus.threshold ? "outline" : "secondary"} 
                  className="text-xs flex-shrink-0"
                >
                  {Math.round(step.confidence * 100)}%
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Status Updates */}
      {statusUpdates.length > 0 && showSettings.showConfidenceScores && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStatusUpdates(!showStatusUpdates)}
            className="h-auto p-0 font-normal text-xs text-muted-foreground hover:text-foreground justify-start"
          >
            {showStatusUpdates ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Hide status updates
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show status updates ({statusUpdates.length})
              </>
            )}
          </Button>
          
          {showStatusUpdates && (
            <div className="space-y-2 max-h-32 overflow-y-auto overflow-x-hidden">
              {statusUpdates.map((update, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">
                      {new Date(update.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="pl-5">
                    <div className="font-medium break-words text-xs">{update.message}</div>
                    {update.details && (
                      <div className="text-muted-foreground break-words whitespace-pre-wrap text-xs mt-1">{update.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Approval Threshold Info */}
      {showSettings.showApprovalDecisions && (
        <div className="text-xs text-muted-foreground">
          Auto-approval threshold: {thresholdPercentage}% confidence
        </div>
      )}
    </div>
  )
} 