import type { 
  WorkflowMemory as IWorkflowMemory, 
  ExecutedStep, 
  CanvasState, 
  UserDecision, 
  PreviousWorkflow,
  AgentStep,
  StepResult
} from './types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

export class WorkflowMemory implements IWorkflowMemory {
  steps: ExecutedStep[] = []
  checkpoints: Map<string, CanvasState> = new Map()
  decisions: UserDecision[] = []
  private canvas: CanvasManager
  
  constructor(canvas: CanvasManager) {
    this.canvas = canvas
  }
  
  recordStep(step: AgentStep, result: StepResult): void {
    this.steps.push({
      step,
      result,
      timestamp: Date.now()
    })
  }
  
  createCheckpoint(id: string): void {
    // Store the current canvas state
    const canvasState = {
      layers: this.canvas.getAllObjects(),
      selection: this.canvas.getSelectedObjects(),
      activeObjectId: Array.from(this.canvas.state.selectedObjectIds)[0] || null,
      backgroundColor: this.canvas.state.backgroundColor,
      ...this.canvas.getViewport()
    }
    this.checkpoints.set(id, {
      id,
      timestamp: Date.now(),
      serializedCanvas: JSON.stringify(canvasState)
    })
  }
  
  revertToCheckpoint(id: string): boolean {
    const checkpoint = this.checkpoints.get(id)
    if (!checkpoint) return false
    
    try {
      // const canvasData = JSON.parse(checkpoint.serializedCanvas)
      // Note: CanvasManager would need a restore method to fully implement this
      // For now, we log a warning as the restore functionality needs to be implemented
      console.warn('Canvas restore functionality needs to be implemented in CanvasManager')
      
      // Remove all steps after this checkpoint
      const checkpointTime = checkpoint.timestamp
      this.steps = this.steps.filter(step => step.timestamp <= checkpointTime)
      
      return true
    } catch (error) {
      console.error('Failed to revert to checkpoint:', error)
      return false
    }
  }
  
  getRecentSteps(count: number): ExecutedStep[] {
    return this.steps.slice(-count)
  }
  
  findSimilarWorkflows(request: string): PreviousWorkflow[] {
    // This is a simplified implementation
    // In a real system, you'd use vector embeddings or more sophisticated similarity matching
    const requestWords = request.toLowerCase().split(' ')
    
    const workflows: Map<string, PreviousWorkflow> = new Map()
    
    // Group steps by request (simplified - assumes steps have some metadata)
    this.steps.forEach((step, index) => {
      // For now, we'll use a simple heuristic based on step descriptions
      const stepWords = step.step.description.toLowerCase().split(' ')
      const commonWords = requestWords.filter(word => stepWords.includes(word))
      const similarity = commonWords.length / Math.max(requestWords.length, stepWords.length)
      
      if (similarity > 0.3) {
        const workflowId = `workflow-${Math.floor(index / 5)}` // Group every 5 steps
        
        if (!workflows.has(workflowId)) {
          workflows.set(workflowId, {
            id: workflowId,
            request: step.step.description,
            steps: [],
            similarity,
            outcome: step.result.success ? 'success' : 'failure'
          })
        }
        
        const workflow = workflows.get(workflowId)!
        workflow.steps.push(step)
      }
    })
    
    return Array.from(workflows.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5) // Return top 5 similar workflows
  }
  
  recordDecision(decision: UserDecision): void {
    this.decisions.push(decision)
  }
} 