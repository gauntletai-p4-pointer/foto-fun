import { useState, useCallback, useEffect } from 'react'
import type { AgentStep, StepResult, AgentContext, ApprovalDecision } from '../types'

interface UseAgentResult {
  pendingApproval: {
    step: AgentStep
    result: StepResult
    context: AgentContext
  } | null
  handleApprovalDecision: (decision: ApprovalDecision) => void
  agentStatus: {
    isRunning: boolean
    message: string
  } | null
  workflowProgress: {
    current: number
    total: number
  } | null
}

export function useAgent(): UseAgentResult {
  const [pendingApproval, setPendingApproval] = useState<UseAgentResult['pendingApproval']>(null)
  const [agentStatus] = useState<UseAgentResult['agentStatus']>(null)
  const [workflowProgress] = useState<UseAgentResult['workflowProgress']>(null)
  
  const handleApprovalDecision = useCallback((decision: ApprovalDecision) => {
    // Handle the approval decision
    console.log('Approval decision:', decision)
    setPendingApproval(null)
    
    // TODO: Send decision back to agent
  }, [])
  
  // Listen for agent events
  useEffect(() => {
    // TODO: Set up event listeners for agent status updates
    
    return () => {
      // Cleanup
    }
  }, [])
  
  return {
    pendingApproval,
    handleApprovalDecision,
    agentStatus,
    workflowProgress
  }
} 