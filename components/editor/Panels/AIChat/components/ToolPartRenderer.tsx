import { AlertTriangle, Loader2, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AgentWorkflowDisplay } from '../AgentWorkflowDisplay'

interface ToolExecution {
  toolName: string
  params: unknown
  description?: string
  confidence?: number
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

interface CostApprovalOutput {
  type?: string
  toolName?: string
  operation?: string
  estimatedCost?: number
  details?: string
  message?: string
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
    const costApprovalData = toolPart.output as CostApprovalOutput
    
    if (costApprovalData?.type === 'cost-approval-required') {
      return (
        <div className="space-y-2">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Cost Approval Required</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {costApprovalData.message}
            </p>
            <div className="text-xs text-blue-600 mt-2 space-y-1">
              <div>Tool: {costApprovalData.toolName}</div>
              <div>Operation: {costApprovalData.operation}</div>
              <div>Estimated Cost: ${costApprovalData.estimatedCost?.toFixed(3)}</div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Please respond with &quot;yes&quot; or &quot;approve&quot; to continue, or &quot;no&quot; to cancel.
            </p>
          </div>
        </div>
      )
    }
  }
  
  // Check if this is the executeAgentWorkflow tool
  const isAgentExecution = toolName === 'executeAgentWorkflow'
  
  // Extract tool output data
  const toolOutput = (toolPart.state === 'output-available' || toolPart.state === 'output-error') 
    ? toolPart.output as AgentWorkflowOutput
    : undefined
  
  // Handle agent workflow approval required
  if (isAgentExecution && toolOutput?.approvalRequired && toolOutput?.step) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            I&apos;ve analyzed your request and created a plan with {toolOutput.toolExecutions?.length || 0} steps.
          </p>
          <p className="mb-2">
            <span className="font-medium">Confidence:</span> {Math.round(toolOutput.step.confidence * 100)}% 
            (threshold: {Math.round(toolOutput.step.threshold * 100)}%)
          </p>
          
          {/* Show the planned tools */}
          {toolOutput.toolExecutions && toolOutput.toolExecutions.length > 0 && (
            <div className="mb-3">
              <p className="font-medium mb-1">Planned operations:</p>
              {toolOutput.toolExecutions.map((exec) => (
                <div key={exec.toolName} className="ml-2 flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{exec.description || `${exec.toolName} with ${JSON.stringify(exec.params)}`}</span>
                  {exec.confidence !== undefined && aiSettings.showConfidenceScores && (
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(exec.confidence * 100)}%)
                    </span>
                  )}
                </div>
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
        <RenderToolStatus toolPart={toolPart} toolName={toolName} />
      </div>
    )
  }
  
  // Default tool rendering
  return (
    <div className="space-y-2">
      <RenderToolStatus toolPart={toolPart} toolName={toolName} />
      
      {/* Always show tool details for regular tools */}
      <RenderToolDetails 
        toolPart={toolPart} 
        isAgentExecution={isAgentExecution}
      />
    </div>
  )
}

// Helper component for tool status
function RenderToolStatus({ toolPart, toolName }: { 
  toolPart: {
    state: string
    errorText?: string
  }
  toolName: string 
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant="default" className="bg-primary text-primary-foreground px-2 py-1">
        <span className="font-medium">{toolName}</span>
      </Badge>
      {toolPart.state === 'input-streaming' && (
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      )}
      {toolPart.state === 'output-available' && !toolPart.errorText && (
        <Check className="w-3 h-3 text-green-600" />
      )}
      {toolPart.state === 'output-error' && (
        <X className="w-3 h-3 text-red-600" />
      )}
    </div>
  )
}

// Helper component for tool details
function RenderToolDetails({ toolPart, isAgentExecution }: { 
  toolPart: {
    state: string
    input?: Record<string, unknown>
    output?: Record<string, unknown>
    errorText?: string
  }
  isAgentExecution: boolean 
}) {
  if (isAgentExecution) return null
  
  return (
    <div className="space-y-2">
      {/* Show input parameters */}
      {(toolPart.state === 'input-available' || toolPart.state === 'output-available') && toolPart.input && (
        <div className="text-xs text-muted-foreground">
          <details>
            <summary className="cursor-pointer">Parameters</summary>
            <pre className="mt-1 overflow-auto">
              {JSON.stringify(toolPart.input, null, 2)}
            </pre>
          </details>
        </div>
      )}
      
      {/* Show errors */}
      {toolPart.state === 'output-error' && toolPart.errorText && (
        <div className="text-xs text-red-600">
          Error: {toolPart.errorText}
        </div>
      )}
      
      {/* Show output */}
      {toolPart.output && toolPart.state === 'output-available' && (
        <div className="text-xs text-muted-foreground">
          <details>
            <summary className="cursor-pointer">Result</summary>
            <pre className="mt-1 overflow-auto">
              {JSON.stringify(toolPart.output, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
} 