import { AlertTriangle } from 'lucide-react'
import { AgentWorkflowDisplay } from '../AgentWorkflowDisplay'
import { AgentStatusDisplay } from '../AgentStatusDisplay'
import { UnifiedToolDisplay } from './UnifiedToolDisplay'

interface ToolExecution {
  toolName: string
  params: unknown
  description?: string
  confidence?: number
}

interface CostApprovalOutput {
  type: 'cost-approval-required'
  message: string
  toolName: string
  operation: string
  estimatedCost?: number
}

interface ExecuteToolChainOutput {
  success: boolean
  chainId: string
  results: Array<{
    tool: string
    success: boolean
    result?: unknown  // Add this field
    error?: string
  }>
  totalTime: number
  message: string
}

interface AgentWorkflowOutput {
  approvalRequired?: boolean
  step?: {
    id: string
    description: string
    confidence: number
    threshold: number
  }
  toolExecutions?: ToolExecution[]
  workflow?: {
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
  agentStatus?: {
    confidence: number
    approvalRequired: boolean
    threshold: number
  }
  statusUpdates?: Array<{
    type: string
    message: string
    details?: string
    timestamp: string
  }>
}

interface ToolPartRendererProps {
  part: {
    type: string
    state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
    input?: Record<string, unknown>
    output?: Record<string, unknown>
    errorText?: string
  }
  messageId: string
  aiSettings: {
    showConfidenceScores: boolean
    showApprovalDecisions: boolean
    showEducationalContent: boolean
  }
  sendMessage: (message: { text: string }, options?: Record<string, unknown>) => void
  messages: unknown[]
}

export function ToolPartRenderer({ 
  part, 
  aiSettings
}: ToolPartRendererProps) {
  // Extract tool name from the type (e.g., 'tool-brightness' -> 'brightness')
  const toolName = part.type.substring(5)
  
  // AI SDK v5 tool part structure
  const toolPart = part
  
  // Check if this is a cost approval request
  if (toolName === 'requestCostApproval' && toolPart.output) {
    const costApprovalData = toolPart.output as unknown as CostApprovalOutput
    
    if (costApprovalData?.type === 'cost-approval-required') {
      return (
        <div className="space-y-2">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Cost Approval Required</span>
            </div>
            <p className="text-sm text-primary/90 mt-1">
              {costApprovalData.message}
            </p>
            <div className="text-xs text-primary/80 mt-2 space-y-1">
              <div>Tool: {costApprovalData.toolName}</div>
              <div>Operation: {costApprovalData.operation}</div>
              <div>Estimated Cost: ${costApprovalData.estimatedCost?.toFixed(3)}</div>
            </div>
            <p className="text-xs text-primary/80 mt-2">
              Please respond with &quot;yes&quot; or &quot;approve&quot; to continue, or &quot;no&quot; to cancel.
            </p>
          </div>
        </div>
      )
    }
  }
  
  // Check if this is the executeAgentWorkflow tool
  const isAgentExecution = toolName === 'executeAgentWorkflow'
  
  // Check if this is the executeToolChain tool
  const isToolChain = toolName === 'executeToolChain'
  
  // Extract tool output data
  const toolOutput = (toolPart.state === 'output-available' || toolPart.state === 'output-error') 
    ? toolPart.output as AgentWorkflowOutput
    : undefined
  
  // Handle agent workflow approval required
  if (isAgentExecution && toolOutput?.approvalRequired && toolOutput?.step) {
    return (
      <div className="space-y-2">
        {/* Show status updates if available */}
        {toolOutput.statusUpdates && toolOutput.statusUpdates.length > 0 && (
          <AgentStatusDisplay 
            statusUpdates={toolOutput.statusUpdates}
            isActive={false} // Already completed
          />
        )}
        
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            I&apos;ve analyzed your request and created a plan with {toolOutput.toolExecutions?.length || 0} steps.
          </p>
          <p className="mb-2">
            <span className="font-medium">Confidence:</span> {Math.round(toolOutput.step.confidence * 100)}% 
            (threshold: {Math.round(toolOutput.step.threshold * 100)}%)
          </p>
          
          {/* Show the planned tools using UnifiedToolDisplay */}
          {toolOutput.toolExecutions && toolOutput.toolExecutions.length > 0 && (
            <div className="mb-3 space-y-2">
              <p className="font-medium mb-1">Planned operations:</p>
              {toolOutput.toolExecutions.map((exec, idx) => (
                <UnifiedToolDisplay
                  key={`${exec.toolName}-${idx}`}
                  toolName={exec.toolName}
                  state="input-available"
                  input={exec.params as Record<string, unknown>}
                  description={exec.description}
                  confidence={exec.confidence}
                  showConfidence={aiSettings.showConfidenceScores}
                  isPartOfChain={true}
                />
              ))}
            </div>
          )}
          
          <p className="text-sm italic">
            Type <span className="font-medium">&quot;approve&quot;</span> to execute this plan, or provide feedback to adjust it.
          </p>
        </div>
      </div>
    )
  }
  
  // Show agent workflow display if available
  if (isAgentExecution && toolOutput?.workflow && toolOutput?.agentStatus) {
    return (
      <div className="space-y-2">
        {/* Show status updates if available */}
        {toolOutput.statusUpdates && toolOutput.statusUpdates.length > 0 && (
          <AgentStatusDisplay 
            statusUpdates={toolOutput.statusUpdates}
            isActive={false} // Already completed
          />
        )}
        
        <AgentWorkflowDisplay
          workflow={toolOutput.workflow}
          agentStatus={toolOutput.agentStatus}
          statusUpdates={toolOutput.statusUpdates || []}
          showSettings={{
            showConfidenceScores: aiSettings.showConfidenceScores,
            showApprovalDecisions: aiSettings.showApprovalDecisions,
            showEducationalContent: aiSettings.showEducationalContent
          }}
        />
      </div>
    )
  }
  
  // Handle executeToolChain display
  if (isToolChain) {
    const chainOutput = toolPart.output as unknown as ExecuteToolChainOutput
    const chainInput = toolPart.input as { steps?: Array<{ tool: string; params: unknown }> }
    
    console.log('[ToolPartRenderer] === TOOL CHAIN RENDER ===')
    console.log('[ToolPartRenderer] Tool part state:', toolPart.state)
    console.log('[ToolPartRenderer] Has output:', !!chainOutput)
    console.log('[ToolPartRenderer] Output results:', chainOutput?.results)
    console.log('[ToolPartRenderer] Input steps:', chainInput?.steps)
    
    // Determine if chain is completed
    const isChainCompleted = toolPart.state === 'output-available' && chainOutput?.results
    
    return (
      <div className="space-y-2">
        {/* Main chain status using UnifiedToolDisplay */}
        <UnifiedToolDisplay
          toolName="Tool Chain"
          state={toolPart.state}
          errorText={toolPart.errorText}
          input={chainInput} // Pass the full input including steps
          output={chainOutput ? {
            success: chainOutput.success,
            totalTime: chainOutput.totalTime,
            message: chainOutput.message
          } : undefined}
        />
        
        {/* Show individual steps */}
        {chainInput?.steps && (
          <div className="space-y-2">
            {chainInput.steps.map((step, idx) => {
              // Get the result for this step if chain is completed
              const stepResult = isChainCompleted ? chainOutput.results[idx] : undefined
              
              // Determine the state for this step
              let stepState: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
              if (!isChainCompleted) {
                // Chain is still running or pending
                stepState = toolPart.state === 'input-streaming' ? 'input-streaming' : 'input-available'
              } else if (stepResult) {
                // Chain is completed, use result status
                stepState = stepResult.success ? 'output-available' : 'output-error'
              } else {
                // Fallback (shouldn't happen)
                stepState = 'input-available'
              }
              
              console.log(`[ToolPartRenderer] Step ${idx} rendering:`, {
                tool: step.tool,
                state: stepState,
                hasResult: !!stepResult,
                resultSuccess: stepResult?.success,
                resultData: stepResult?.result
              })
              
              return (
                <UnifiedToolDisplay
                  key={`chain-step-${idx}`} // Use stable key
                  toolName={step.tool}
                  state={stepState}
                  input={step.params as Record<string, unknown>}
                  output={stepResult?.success && stepResult.result ? 
                    stepResult.result as Record<string, unknown> : 
                    stepResult?.success ? { 
                      success: true,
                      message: `${step.tool} completed successfully`
                    } : undefined
                  }
                  errorText={stepResult?.error}
                  isPartOfChain={true}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }
  
  // Default tool rendering using UnifiedToolDisplay
  return (
    <UnifiedToolDisplay
      toolName={toolName}
      state={toolPart.state}
      input={toolPart.input}
      output={toolPart.output}
      errorText={toolPart.errorText}
      showConfidence={aiSettings.showConfidenceScores}
    />
  )
} 