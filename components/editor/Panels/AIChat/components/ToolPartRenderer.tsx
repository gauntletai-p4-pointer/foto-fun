import { AlertTriangle } from 'lucide-react'
import { AgentWorkflowDisplay } from '../AgentWorkflowDisplay'
import { AgentStatusDisplay } from '../AgentStatusDisplay'
import { UnifiedToolDisplay } from './UnifiedToolDisplay'
import { EvaluationResultDisplay } from './EvaluationResultDisplay'
import { useState, useEffect } from 'react'

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
  iterationCount?: number
  maxIterations?: number
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
  
  // State to track chain step results for re-rendering
  const [chainStepResults, setChainStepResults] = useState<Record<number, {
    state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
    output?: Record<string, unknown>
    error?: string
  }>>({})
  
  // Effect to update step results when chain completes
  useEffect(() => {
    if (toolName === 'executeToolChain' && toolPart.state === 'output-available' && toolPart.output) {
      const chainOutput = toolPart.output as unknown as ExecuteToolChainOutput
      if (chainOutput?.results) {
        console.log('[ToolPartRenderer] Chain completed, updating step results')
        
        // Build new step results
        const newStepResults: typeof chainStepResults = {}
        chainOutput.results.forEach((result, idx) => {
          newStepResults[idx] = {
            state: result.success ? 'output-available' : 'output-error',
            output: result.result as Record<string, unknown> | undefined,
            error: result.error
          }
        })
        
        // Update state to trigger re-render
        setChainStepResults(newStepResults)
      }
    }
  }, [toolName, toolPart.state, toolPart.output])
  
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
  
  // Extract tool input data for active workflows
  const toolInput = (toolPart.state === 'input-streaming' || toolPart.state === 'input-available')
    ? toolPart.input as Record<string, unknown>
    : undefined
  
  // Show active status updates during agent workflow execution
  if (isAgentExecution && (toolPart.state === 'input-streaming' || toolPart.state === 'input-available')) {
    // For input-streaming, we show a thinking indicator
    if (toolPart.state === 'input-streaming') {
      return (
        <div className="space-y-2">
          <div className="p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
              </div>
              <span className="text-sm font-medium">Agent is analyzing your request...</span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                <span>Capturing screenshot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                <span>Analyzing with computer vision</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                <span>Creating enhancement plan</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // Check if we have status updates in the input (for active workflows)
    const inputWithStatus = toolInput as { statusUpdates?: Array<{
      type: string
      message: string
      details?: string
      timestamp: string
    }> }
    const activeStatusUpdates = inputWithStatus?.statusUpdates || []
    
    if (activeStatusUpdates.length > 0) {
      return (
        <div className="space-y-2">
          <AgentStatusDisplay 
            statusUpdates={activeStatusUpdates}
            isActive={true} // Active workflow
          />
        </div>
      )
    }
  }
  
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
    console.log('[ToolPartRenderer] Chain step results state:', chainStepResults)
    
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
              // Use state-tracked results if available, otherwise derive from chain output
              const stepResultFromState = chainStepResults[idx]
              const stepResultFromOutput = isChainCompleted ? chainOutput.results[idx] : undefined
              
              // Determine the state for this step
              let stepState: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
              let stepOutput: Record<string, unknown> | undefined
              let stepError: string | undefined
              
              if (stepResultFromState) {
                // Use state-tracked result (after chain completion)
                stepState = stepResultFromState.state
                stepOutput = stepResultFromState.output
                stepError = stepResultFromState.error
              } else if (!isChainCompleted) {
                // Chain is still running or pending
                stepState = toolPart.state === 'input-streaming' ? 'input-streaming' : 'input-available'
              } else if (stepResultFromOutput) {
                // Chain just completed, use output result
                stepState = stepResultFromOutput.success ? 'output-available' : 'output-error'
                stepOutput = stepResultFromOutput.result as Record<string, unknown> | undefined
                stepError = stepResultFromOutput.error
              } else {
                // Fallback (shouldn't happen)
                stepState = 'input-available'
              }
              
              console.log(`[ToolPartRenderer] Step ${idx} rendering:`, {
                tool: step.tool,
                state: stepState,
                hasStateResult: !!stepResultFromState,
                hasOutputResult: !!stepResultFromOutput,
                output: stepOutput,
                error: stepError
              })
              
              // Process the output to ensure it has the right structure
              let processedOutput: Record<string, unknown> | undefined = undefined
              
              if (stepState === 'output-available' && (stepOutput || stepResultFromOutput?.result)) {
                const rawResult = stepOutput || stepResultFromOutput?.result
                
                // If result is already an object with success property, use it
                if (rawResult && typeof rawResult === 'object' && 'success' in rawResult) {
                  processedOutput = rawResult as Record<string, unknown>
                } 
                // Otherwise, wrap it in a standard format
                else if (rawResult) {
                  processedOutput = {
                    success: true,
                    result: rawResult,
                    message: `${step.tool} completed`
                  }
                }
                // If no result data but step succeeded, show a success message
                else {
                  processedOutput = {
                    success: true,
                    message: `${step.tool} completed successfully`
                  }
                }
              }
              
              return (
                <UnifiedToolDisplay
                  key={`chain-step-${idx}`} // Use stable key
                  toolName={step.tool}
                  state={stepState}
                  input={step.params as Record<string, unknown>}
                  output={processedOutput}
                  errorText={stepError}
                  isPartOfChain={true}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }
  
  // Check if this is the captureAndEvaluate tool
  if (toolName === 'captureAndEvaluate' && toolPart.state === 'output-available' && toolPart.output) {
    const evaluationResult = toolPart.output as {
      type?: string
      evaluation?: string
      successScore?: number
      goalsMet?: boolean
      iterationCount?: number
      shouldContinue?: boolean
      message?: string
    }
    
    if (evaluationResult.type === 'evaluation-result' && evaluationResult.evaluation) {
      return (
        <EvaluationResultDisplay
          evaluation={evaluationResult.evaluation}
          successScore={evaluationResult.successScore || 0}
          goalsMet={evaluationResult.goalsMet || false}
          iterationCount={evaluationResult.iterationCount || 1}
          shouldContinue={evaluationResult.shouldContinue || false}
          message={evaluationResult.message || 'Evaluation complete'}
        />
      )
    }
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