import type { Canvas } from 'fabric'
import type { UIMessage } from 'ai'

// Core agent types
export interface AgentContext {
  canvas: Canvas
  conversation: UIMessage[]
  workflowMemory: WorkflowMemory
  userPreferences: UserPreferences
  canvasAnalysis: CanvasAnalysis
}

export interface AgentStep {
  id: string
  type: 'tool' | 'evaluate' | 'plan' | 'route'
  description: string
  execute: (context: AgentContext) => Promise<StepResult>
  canRevert?: boolean
  requiresApproval?: (result: StepResult) => boolean
}

export interface StepResult {
  success: boolean
  data: unknown
  confidence: number
  preview?: PreviewData
  alternatives?: Alternative[]
  nextSteps?: AgentStep[]
}

export interface PreviewData {
  before: string // base64 or URL
  after: string  // base64 or URL
  diff?: string  // optional difference visualization
}

export interface Alternative {
  id: string
  description: string
  params: unknown
  preview?: PreviewData
  confidence: number
}

export interface WorkflowMemory {
  steps: ExecutedStep[]
  checkpoints: Map<string, CanvasState>
  decisions: UserDecision[]
  
  recordStep(step: AgentStep, result: StepResult): void
  createCheckpoint(id: string): void
  revertToCheckpoint(id: string): boolean
  getRecentSteps(count: number): ExecutedStep[]
  findSimilarWorkflows(request: string): PreviousWorkflow[]
}

export interface ExecutedStep {
  step: AgentStep
  result: StepResult
  timestamp: number
  canvasState?: CanvasState
}

export interface CanvasState {
  id: string
  timestamp: number
  serializedCanvas: string // JSON representation
  metadata?: Record<string, unknown>
}

export interface UserDecision {
  stepId: string
  action: 'approve' | 'reject' | 'modify'
  alternativeIndex?: number
  feedback?: string
  timestamp: number
}

export interface PreviousWorkflow {
  id: string
  request: string
  steps: ExecutedStep[]
  similarity: number
  outcome: 'success' | 'failure' | 'partial'
}

export interface UserPreferences {
  autoApprovalThreshold: number
  maxAutonomousSteps: number
  preferredComparisonMode: ComparisonMode
  historicalChoices: UserDecision[]
}

export interface CanvasAnalysis {
  dimensions: { width: number; height: number }
  hasContent: boolean
  objectCount: number
  dominantColors?: string[]
  brightness?: number
  contrast?: number
  lastAnalyzedAt: number
}

export type ComparisonMode = 'side-by-side' | 'overlay' | 'difference' | 'slider'

export interface AgentResult {
  completed: boolean
  results: StepResult[]
  reason?: string
}

export interface ApprovalDecision {
  action: 'approve' | 'reject' | 'modify'
  alternativeIndex?: number
  feedback?: string
  rememberDecision?: boolean
} 