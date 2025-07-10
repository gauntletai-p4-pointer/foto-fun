'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Brain, CheckCircle2, AlertTriangle, Clock, Wrench, Info } from 'lucide-react'
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
    visionInsights?: string
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
  const [showReasoning, setShowReasoning] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
  
  const thresholdPercentage = Math.round(agentStatus.threshold * 100)
  const confidencePercentage = Math.round(agentStatus.confidence * 100)
  
  const toggleStep = (idx: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx)
    } else {
      newExpanded.add(idx)
    }
    setExpandedSteps(newExpanded)
  }
  
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border w-full">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-medium text-sm">Agent Analysis Complete</span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
            {workflow.agentType}
          </Badge>
          
          {showSettings.showApprovalDecisions && (
            <>
              {agentStatus.approvalRequired ? (
                <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  Manual Approval Required
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 border-green-500 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Auto-Approved
                </Badge>
              )}
            </>
          )}
          
          {showSettings.showConfidenceScores && (
            <Badge 
              variant={agentStatus.confidence >= agentStatus.threshold ? "outline" : "secondary"} 
              className="text-xs"
            >
              Confidence: {confidencePercentage}%
            </Badge>
          )}
        </div>
      </div>
      
      {/* Workflow Description */}
      <div className="text-sm text-muted-foreground">
        {workflow.description}
      </div>
      
      {/* Vision Insights (if available) */}
      {workflow.visionInsights && showSettings.showEducationalContent && (
        <div className="p-3 bg-primary/5 rounded-md space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Info className="w-3 h-3" />
            Vision Analysis Insights
          </div>
          <p className="text-xs text-muted-foreground">
            {workflow.visionInsights}
          </p>
        </div>
      )}
      
      {/* Reasoning Toggle */}
      {workflow.reasoning && showSettings.showEducationalContent && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReasoning(!showReasoning)}
            className="h-auto p-0 font-normal text-xs text-muted-foreground hover:text-foreground"
          >
            {showReasoning ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Hide reasoning
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show reasoning
              </>
            )}
          </Button>
          
          {showReasoning && (
            <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md">
              {workflow.reasoning}
            </div>
          )}
        </div>
      )}
      
      {/* Planned Steps - Vertical Layout */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-3 h-3 text-muted-foreground" />
          <span className="text-sm font-medium">Enhancement Plan ({workflow.totalSteps} steps)</span>
        </div>
        
        <div className="space-y-2">
          {workflow.steps.map((step, idx) => (
            <div 
              key={idx} 
              className="border rounded-lg p-3 bg-background/50 space-y-2"
            >
              {/* Tool Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Step {idx + 1}
                  </span>
                  <Badge variant="default" className="bg-primary text-primary-foreground">
                    {step.toolName}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  {showSettings.showConfidenceScores && (
                    <Badge 
                      variant={step.confidence >= agentStatus.threshold ? "outline" : "secondary"} 
                      className="text-xs"
                    >
                      {Math.round(step.confidence * 100)}%
                    </Badge>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStep(idx)}
                    className="h-6 w-6 p-0"
                  >
                    {expandedSteps.has(idx) ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Tool Description */}
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
              
              {/* Tool Parameters (Collapsible) */}
              {expandedSteps.has(idx) && (
                <div className="pt-2 border-t">
                  <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(step.params, null, 2)}
                  </pre>
                </div>
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
                Hide processing details
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show processing details ({statusUpdates.length})
              </>
            )}
          </Button>
          
          {showStatusUpdates && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
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
      
      {/* Approval Info */}
      {showSettings.showApprovalDecisions && (
        <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
          <div>Auto-approval threshold: {thresholdPercentage}%</div>
          <div>Plan confidence: {confidencePercentage}%</div>
          {agentStatus.approvalRequired && (
            <div className="text-amber-600 font-medium">
              Manual approval required (confidence below threshold)
            </div>
          )}
        </div>
      )}
    </div>
  )
} 