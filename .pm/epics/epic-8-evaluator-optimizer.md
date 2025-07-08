# Epic 8: Evaluator-Optimizer & Quality Control

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-8-evaluator-optimizer`
2. **Base Branch**: Branch off from `main` 
3. **Commits**: Use conventional commits (e.g., `feat: add quality evaluator`, `fix: optimization iteration logic`)
4. **Pull Request**: 
   - Title: "Epic 8: Evaluator-Optimizer & Quality Control"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**: 
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   - Ensure Epic 5 (Core Tools) and Epic 7 (Visual Feedback) are available
   
2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed
   
3. **Testing Requirements**:
   - Test quality evaluation accuracy
   - Test optimization convergence (should improve scores)
   - Test A/B testing statistical significance
   - Test user feedback collection flow
   - Test learning system improvements
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Coordination
- Check #dev-canvas channel in Slack/Discord for updates
- Don't modify files being worked on in other epics
- If you need changes in shared files (e.g., constants, types), coordinate with team

### Epic Start Process

Before implementing evaluation system:

1. **Deep Dive Analysis** (Required)
   - Study AI SDK v5 evaluator-optimizer patterns
   - Analyze existing quality metrics in codebase
   - Understand current feedback mechanisms
   - Document optimization approaches used
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Study image quality assessment algorithms
   - Research iterative optimization techniques
   - Investigate A/B testing methodologies
   - Compare different quality metrics

3. **Gap Identification**
   - Quality metric calculations
   - Optimization convergence logic
   - Feedback collection UI
   - Learning system storage

### Epic End Process

1. **Quality Validation**
   - Evaluations accurate and consistent
   - Optimization improves scores 15%+
   - A/B tests statistically significant
   - Learning system improving

2. **Integration Testing**
   - Test with diverse image types
   - Test optimization convergence
   - Test feedback collection flow
   - Verify performance impact

3. **Documentation**
   - Quality metrics explanation
   - Optimization algorithm docs
   - A/B testing methodology

---

## Overview
This epic implements the evaluator-optimizer pattern from AI SDK v5 to assess edit quality and automatically optimize parameters. We'll build an AI-powered quality assessment system that can evaluate edits, suggest improvements, and iteratively refine results.

## References
- [AI SDK v5 Evaluator-Optimizer Pattern](https://v5.ai-sdk.dev/docs/foundations/agents#evaluator-optimizer)
- [Image Generation for Evaluation](https://v5.ai-sdk.dev/docs/ai-sdk-core/image-generation)
- [Structured Output for Metrics](https://v5.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)

## Key Implementation Details

### 1. Image Quality Evaluator

**File to Create**: `lib/ai/evaluation/quality-evaluator.ts`
```typescript
import { z } from 'zod'
import { generateObject } from 'ai'
import { openai } from '@/lib/ai/providers'

const QualityEvaluationSchema = z.object({
  overallScore: z.number().min(1).max(10),
  technicalQuality: z.object({
    sharpness: z.number().min(1).max(10),
    noiseLevel: z.number().min(1).max(10),
    colorAccuracy: z.number().min(1).max(10),
    exposure: z.number().min(1).max(10),
    contrast: z.number().min(1).max(10),
    saturation: z.number().min(1).max(10)
  }),
  aestheticQuality: z.object({
    composition: z.number().min(1).max(10),
    colorHarmony: z.number().min(1).max(10),
    visualImpact: z.number().min(1).max(10),
    balance: z.number().min(1).max(10),
    mood: z.string()
  }),
  matchesIntent: z.object({
    score: z.number().min(0).max(1),
    explanation: z.string(),
    missingElements: z.array(z.string())
  }),
  issues: z.array(z.object({
    type: z.enum(['technical', 'aesthetic', 'intent']),
    severity: z.enum(['minor', 'moderate', 'severe']),
    description: z.string(),
    location: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }).optional()
  })),
  suggestions: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    description: z.string(),
    toolName: z.string(),
    params: z.any(),
    expectedImprovement: z.number().min(1).max(10)
  }))
})

export class QualityEvaluator {
  static async evaluate(
    before: string, // base64
    after: string,  // base64
    userIntent: string,
    appliedOperations: string[]
  ): Promise<z.infer<typeof QualityEvaluationSchema>> {
    const { object: evaluation } = await generateObject({
      model: openai('gpt-4o-vision'),
      schema: QualityEvaluationSchema,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Evaluate this photo edit comprehensively:
            
User Intent: ${userIntent}
Applied Operations: ${appliedOperations.join(', ')}

Please analyze:
1. Technical quality (sharpness, noise, color, exposure, contrast, saturation)
2. Aesthetic quality (composition, harmony, impact, balance, mood)
3. How well the edit matches user intent
4. Any issues or artifacts (with locations if applicable)
5. Specific suggestions for improvement`
          },
          { type: 'image', image: before },
          { type: 'image', image: after }
        ]
      }]
    })
    
    return evaluation
  }
}
```

### 2. Parameter Optimizer

**File to Create**: `lib/ai/optimization/parameter-optimizer.ts`
```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

const OptimizationSchema = z.object({
  adjustments: z.array(z.object({
    toolName: z.string(),
    currentParams: z.any(),
    optimizedParams: z.any(),
    reasoning: z.string(),
    expectedImprovement: z.object({
      technical: z.number(),
      aesthetic: z.number(),
      overall: z.number()
    })
  })),
  strategy: z.enum(['incremental', 'aggressive', 'conservative']),
  iterations: z.number().min(1).max(5)
})

export class ParameterOptimizer {
  static async optimize(
    evaluation: QualityEvaluation,
    currentParams: any,
    constraints: OptimizationConstraints
  ): Promise<z.infer<typeof OptimizationSchema>> {
    // Don't optimize if quality is already high
    if (evaluation.overallScore >= 8.5 && evaluation.matchesIntent.score >= 0.9) {
      return {
        adjustments: [],
        strategy: 'conservative',
        iterations: 0
      }
    }
    
    const { object: optimization } = await generateObject({
      model: openai('gpt-4o'),
      schema: OptimizationSchema,
      system: `You are an expert photo editing optimizer. Based on quality evaluation, suggest parameter adjustments that will improve the image while respecting constraints.`,
      prompt: `Current evaluation: ${JSON.stringify(evaluation)}
Current parameters: ${JSON.stringify(currentParams)}
Constraints: ${JSON.stringify(constraints)}`
    })
    
    return optimization
  }
}
```

### 3. Iterative Improvement Loop

**File to Create**: `lib/ai/optimization/iterative-improver.ts`
```typescript
export class IterativeImprover {
  private maxIterations = 5
  private targetScore = 8.5
  private improvementThreshold = 0.5
  
  async improve(
    initialImage: string,
    userIntent: string,
    appliedTools: string[],
    onIteration?: (iteration: number, score: number) => void
  ): Promise<ImprovementResult> {
    let currentImage = initialImage
    let currentScore = 0
    let iterations = 0
    const history: IterationHistory[] = []
    
    while (iterations < this.maxIterations) {
      // Evaluate current state
      const evaluation = await QualityEvaluator.evaluate(
        initialImage,
        currentImage,
        userIntent,
        appliedTools
      )
      
      currentScore = evaluation.overallScore
      onIteration?.(iterations + 1, currentScore)
      
      // Check if we've reached target quality
      if (currentScore >= this.targetScore) {
        break
      }
      
      // Check if improvement has plateaued
      if (iterations > 0) {
        const lastScore = history[history.length - 1].score
        if (currentScore - lastScore < this.improvementThreshold) {
          break
        }
      }
      
      // Optimize parameters
      const optimization = await ParameterOptimizer.optimize(
        evaluation,
        this.getCurrentParams(),
        this.getConstraints()
      )
      
      // Apply optimizations
      for (const adjustment of optimization.adjustments) {
        currentImage = await this.applyAdjustment(currentImage, adjustment)
      }
      
      // Record iteration
      history.push({
        iteration: iterations + 1,
        evaluation,
        optimization,
        image: currentImage,
        score: currentScore
      })
      
      iterations++
    }
    
    return {
      finalImage: currentImage,
      finalScore: currentScore,
      iterations,
      history,
      improved: currentScore > history[0]?.score
    }
  }
}
```

### 4. Quality Metrics Dashboard

**File to Create**: `components/editor/QualityDashboard/index.tsx`
```typescript
interface QualityDashboardProps {
  evaluation: QualityEvaluation
  onOptimize: () => void
  isOptimizing: boolean
}

export function QualityDashboard({ 
  evaluation, 
  onOptimize,
  isOptimizing 
}: QualityDashboardProps) {
  return (
    <div className="bg-background border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quality Assessment</h3>
        <div className="text-2xl font-bold text-primary">
          {evaluation.overallScore.toFixed(1)}/10
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <QualityMetricGroup
          title="Technical Quality"
          metrics={evaluation.technicalQuality}
        />
        <QualityMetricGroup
          title="Aesthetic Quality"
          metrics={evaluation.aestheticQuality}
        />
      </div>
      
      <IntentMatchIndicator
        score={evaluation.matchesIntent.score}
        explanation={evaluation.matchesIntent.explanation}
      />
      
      {evaluation.issues.length > 0 && (
        <IssuesList issues={evaluation.issues} />
      )}
      
      {evaluation.suggestions.length > 0 && (
        <SuggestionsList 
          suggestions={evaluation.suggestions}
          onApplySuggestion={(suggestion) => {
            // Apply suggested improvement
          }}
        />
      )}
      
      <Button
        onClick={onOptimize}
        disabled={isOptimizing || evaluation.overallScore >= 9}
        className="w-full"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Optimizing...
          </>
        ) : (
          'Auto-Optimize'
        )}
      </Button>
    </div>
  )
}
```

### 5. A/B Testing System

**File to Create**: `lib/ai/testing/ab-tester.ts`
```typescript
export class ABTester {
  static async runTest(
    originalImage: string,
    variations: EditVariation[],
    testCriteria: TestCriteria
  ): Promise<ABTestResult> {
    // Evaluate each variation
    const evaluations = await Promise.all(
      variations.map(async (variation) => {
        const evaluation = await QualityEvaluator.evaluate(
          originalImage,
          variation.image,
          testCriteria.userIntent,
          variation.operations
        )
        
        return {
          variation,
          evaluation,
          score: this.calculateWeightedScore(evaluation, testCriteria.weights)
        }
      })
    )
    
    // Rank variations
    const ranked = evaluations.sort((a, b) => b.score - a.score)
    
    // Statistical significance
    const significance = await this.calculateSignificance(ranked)
    
    return {
      winner: ranked[0],
      rankings: ranked,
      significance,
      insights: await this.generateInsights(ranked)
    }
  }
  
  static async generateVariations(
    baseImage: string,
    operation: string,
    parameterRanges: ParameterRanges
  ): Promise<EditVariation[]> {
    // Generate systematic variations
    const variations: EditVariation[] = []
    
    // Grid search through parameter space
    for (const params of this.gridSearch(parameterRanges)) {
      const image = await this.applyEdit(baseImage, operation, params)
      variations.push({
        id: crypto.randomUUID(),
        image,
        operations: [operation],
        params
      })
    }
    
    return variations
  }
}
```

### 6. User Feedback Collection

**File to Create**: `components/editor/FeedbackCollector/index.tsx`
```typescript
interface FeedbackCollectorProps {
  editId: string
  onFeedback: (feedback: UserFeedback) => void
}

export function FeedbackCollector({ editId, onFeedback }: FeedbackCollectorProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [aspects, setAspects] = useState<FeedbackAspects>({
    technical: null,
    aesthetic: null,
    matchesIntent: null
  })
  
  return (
    <div className="fixed bottom-4 left-4 bg-background border rounded-lg p-4 shadow-lg">
      <h4 className="text-sm font-medium mb-3">How's this edit?</h4>
      
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={cn(
              "p-1 transition-colors",
              rating && rating >= star ? "text-yellow-500" : "text-muted-foreground"
            )}
          >
            <Star className="w-5 h-5 fill-current" />
          </button>
        ))}
      </div>
      
      {rating && rating <= 3 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs text-muted-foreground">What could be better?</p>
          <AspectRating
            aspect="Technical Quality"
            value={aspects.technical}
            onChange={(v) => setAspects({ ...aspects, technical: v })}
          />
          <AspectRating
            aspect="Visual Appeal"
            value={aspects.aesthetic}
            onChange={(v) => setAspects({ ...aspects, aesthetic: v })}
          />
          <AspectRating
            aspect="Matches Intent"
            value={aspects.matchesIntent}
            onChange={(v) => setAspects({ ...aspects, matchesIntent: v })}
          />
        </div>
      )}
      
      <Button
        size="sm"
        onClick={() => {
          if (rating) {
            onFeedback({
              editId,
              rating,
              aspects,
              timestamp: Date.now()
            })
          }
        }}
        disabled={!rating}
      >
        Submit Feedback
      </Button>
    </div>
  )
}
```

### 7. Learning System

**File to Create**: `lib/ai/learning/feedback-learner.ts`
```typescript
export class FeedbackLearner {
  private feedbackHistory: UserFeedback[] = []
  private parameterPreferences = new Map<string, ParameterPreference>()
  
  async learnFromFeedback(feedback: UserFeedback, evaluation: QualityEvaluation) {
    this.feedbackHistory.push(feedback)
    
    // Update parameter preferences based on feedback
    if (feedback.rating >= 4) {
      // Learn what parameters led to good results
      await this.updatePreferences(evaluation, 'positive')
    } else {
      // Learn what to avoid
      await this.updatePreferences(evaluation, 'negative')
    }
    
    // Retrain confidence models periodically
    if (this.feedbackHistory.length % 100 === 0) {
      await this.retrainModels()
    }
  }
  
  getParameterBias(tool: string, param: string): number {
    const key = `${tool}.${param}`
    const preference = this.parameterPreferences.get(key)
    return preference?.bias || 0
  }
  
  async suggestParameters(
    tool: string,
    baseParams: any,
    context: EditContext
  ): Promise<any> {
    // Apply learned biases to parameters
    const biasedParams = { ...baseParams }
    
    for (const [param, value] of Object.entries(baseParams)) {
      const bias = this.getParameterBias(tool, param)
      if (typeof value === 'number') {
        biasedParams[param] = value + (value * bias)
      }
    }
    
    return biasedParams
  }
}
```

### 8. Evaluation History Viewer

**File to Create**: `components/editor/EvaluationHistory/index.tsx`
```typescript
export function EvaluationHistory({ 
  history,
  onSelectIteration 
}: EvaluationHistoryProps) {
  return (
    <div className="space-y-2">
      {history.map((iteration, index) => (
        <button
          key={iteration.id}
          onClick={() => onSelectIteration(iteration)}
          className="w-full p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Iteration {index + 1}
            </span>
            <span className="text-lg font-bold">
              {iteration.evaluation.overallScore.toFixed(1)}
            </span>
          </div>
          
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              Technical: {iteration.evaluation.technicalQuality.average.toFixed(1)}
            </div>
            <div>
              Aesthetic: {iteration.evaluation.aestheticQuality.average.toFixed(1)}
            </div>
            <div>
              Intent: {(iteration.evaluation.matchesIntent.score * 10).toFixed(1)}
            </div>
          </div>
          
          {iteration.optimization && (
            <div className="mt-2 text-xs text-muted-foreground">
              {iteration.optimization.adjustments.length} adjustments
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
```

### 9. Integration with Tools

**File to Modify**: `lib/ai/tools/factory.ts`
```typescript
// Add evaluation capabilities to tools
interface ToolFactoryConfig {
  // ... existing fields
  evaluator?: (before: string, after: string) => Promise<ToolSpecificMetrics>
  optimizer?: (params: any, evaluation: QualityEvaluation) => Promise<any>
}
```

### 10. API Integration

**File to Modify**: `app/api/ai/chat/route.ts`
```typescript
// Add evaluation endpoints
export async function POST(req: Request) {
  const { action, ...params } = await req.json()
  
  switch (action) {
    case 'evaluate':
      return handleEvaluation(params)
    case 'optimize':
      return handleOptimization(params)
    case 'feedback':
      return handleFeedback(params)
    default:
      return handleChat(params)
  }
}
```

## Testing Requirements

**Files to Create**:
- `__tests__/ai/evaluation/quality-evaluator.test.ts`
- `__tests__/ai/optimization/parameter-optimizer.test.ts`
- `__tests__/ai/testing/ab-tester.test.ts`

## Success Criteria
1. Quality evaluations complete in <2 seconds
2. Optimization improves scores by average 15%
3. A/B tests show statistical significance
4. User feedback correlates with AI evaluations
5. Learning system improves suggestions over time
6. No more than 5 optimization iterations needed

## Dependencies
- Epic 5 (Core Tools) for tool definitions
- Epic 7 (Visual Feedback) for UI components
- Vision model access (GPT-4V or similar)

## Estimated Effort
- 1 developer × 6-7 days
- Requires expertise in:
  - Image quality metrics
  - Statistical analysis
  - Machine learning basics
  - Vision model APIs 