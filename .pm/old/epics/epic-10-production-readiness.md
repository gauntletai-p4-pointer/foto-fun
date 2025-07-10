# Epic 10: Production Readiness & Optimization

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-10-production-readiness`
2. **Base Branch**: Branch off from `main` 
3. **Commits**: Use conventional commits (e.g., `feat: add rate limiting`, `fix: error handler retry logic`)
4. **Pull Request**: 
   - Title: "Epic 10: Production Readiness & Optimization"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**: 
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   - Coordinate with all other epic developers for integration
   
2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed
   
3. **Testing Requirements**:
   - Test error handling with various failure scenarios
   - Test rate limiting enforcement
   - Test cache hit rates
   - Test performance monitoring accuracy
   - Test graceful degradation fallbacks
   - Load test with concurrent requests
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

Before implementing production features:

1. **Deep Dive Analysis** (Required)
   - Study existing error handling patterns
   - Analyze current performance bottlenecks
   - Understand API integration points
   - Document monitoring approaches
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Study production best practices
   - Research caching strategies
   - Investigate monitoring solutions
   - Compare rate limiting approaches

3. **Gap Identification**
   - Error handling coverage gaps
   - Performance optimization needs
   - Monitoring infrastructure
   - Security vulnerabilities

### Epic End Process

1. **Quality Validation**
   - 99.9% uptime achievable
   - <5s p95 latency for chat
   - All errors handled gracefully
   - Cost tracking accurate

2. **Integration Testing**
   - Load test with 100+ concurrent users
   - Test all failure scenarios
   - Test rate limiting enforcement
   - Verify monitoring accuracy

3. **Documentation**
   - Production deployment guide
   - Monitoring dashboard setup
   - Incident response playbook

---

## Overview
This epic focuses on making the AI system production-ready with proper error handling, rate limiting, caching, monitoring, and performance optimization. We'll implement best practices from AI SDK v5 for production deployments.

## References
- [AI SDK v5 Error Handling](https://v5.ai-sdk.dev/docs/ai-sdk-core/errors)
- [Streaming Best Practices](https://v5.ai-sdk.dev/docs/ai-sdk-core/streaming)
- [Production Deployment Guide](https://v5.ai-sdk.dev/docs/guides/production)

## Key Implementation Details

### 1. Comprehensive Error Handling

**File to Create**: `lib/ai/errors/error-handler.ts`
```typescript
import { z } from 'zod'
import { APICallError, InvalidToolArgumentsError } from 'ai'

export enum AIErrorCode {
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_INPUT = 'INVALID_INPUT',
  TOOL_EXECUTION = 'TOOL_EXECUTION',
  NETWORK = 'NETWORK',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  CONTEXT_LENGTH = 'CONTEXT_LENGTH',
  TIMEOUT = 'TIMEOUT'
}

export class AIErrorHandler {
  static async handle(error: unknown): Promise<ErrorResponse> {
    // AI SDK specific errors
    if (error instanceof APICallError) {
      return this.handleAPIError(error)
    }
    
    if (error instanceof InvalidToolArgumentsError) {
      return {
        code: AIErrorCode.INVALID_INPUT,
        message: 'Invalid tool parameters provided',
        details: error.toolArgs,
        userMessage: 'I couldn\'t understand the parameters for that operation. Could you clarify?',
        retry: true
      }
    }
    
    // Rate limiting
    if (this.isRateLimitError(error)) {
      return {
        code: AIErrorCode.RATE_LIMIT,
        message: 'Rate limit exceeded',
        retryAfter: this.extractRetryAfter(error),
        userMessage: 'I\'m processing too many requests. Please wait a moment.',
        retry: true
      }
    }
    
    // Context length
    if (this.isContextLengthError(error)) {
      return {
        code: AIErrorCode.CONTEXT_LENGTH,
        message: 'Context too long',
        userMessage: 'Our conversation is getting too long. Let me start fresh.',
        action: 'CLEAR_CONTEXT'
      }
    }
    
    // Default
    return {
      code: AIErrorCode.NETWORK,
      message: 'An unexpected error occurred',
      userMessage: 'Something went wrong. Please try again.',
      retry: true
    }
  }
  
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries || 3
    const backoff = options.backoff || 'exponential'
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        const errorResponse = await this.handle(error)
        
        if (!errorResponse.retry || attempt === maxRetries - 1) {
          throw new AIError(errorResponse)
        }
        
        const delay = this.calculateDelay(attempt, backoff, errorResponse.retryAfter)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw new Error('Max retries exceeded')
  }
}
```

### 2. Rate Limiting System

**File to Create**: `lib/ai/rate-limiting/limiter.ts`
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export class AIRateLimiter {
  private limiters: Map<string, Ratelimit>
  
  constructor() {
    const redis = Redis.fromEnv()
    
    this.limiters = new Map([
      ['chat', new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
        analytics: true
      })],
      ['image-generation', new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 images per minute
        analytics: true
      })],
      ['evaluation', new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 evaluations per minute
        analytics: true
      })]
    ])
  }
  
  async checkLimit(
    userId: string,
    operation: string
  ): Promise<RateLimitResult> {
    const limiter = this.limiters.get(operation) || this.limiters.get('chat')!
    const { success, limit, reset, remaining } = await limiter.limit(userId)
    
    if (!success) {
      // Log for monitoring
      await this.logRateLimitExceeded(userId, operation)
    }
    
    return {
      allowed: success,
      limit,
      remaining,
      reset: new Date(reset)
    }
  }
  
  async getUserUsage(userId: string): Promise<UsageStats> {
    const usage: UsageStats = {}
    
    for (const [operation, limiter] of this.limiters) {
      const analytics = await limiter.analytics.get(userId)
      usage[operation] = {
        requests: analytics?.requests || 0,
        limited: analytics?.limited || 0
      }
    }
    
    return usage
  }
}
```

### 3. Response Caching

**File to Create**: `lib/ai/caching/response-cache.ts`
```typescript
import { createHash } from 'crypto'
import { kv } from '@vercel/kv'

export class AIResponseCache {
  private ttl = {
    evaluation: 3600,      // 1 hour
    generation: 86400,     // 24 hours
    toolResult: 300,       // 5 minutes
    intent: 600           // 10 minutes
  }
  
  async get<T>(
    operation: string,
    params: any
  ): Promise<CacheResult<T>> {
    const key = this.generateKey(operation, params)
    const cached = await kv.get<CachedResponse<T>>(key)
    
    if (!cached) {
      return { hit: false }
    }
    
    // Check if still valid
    if (Date.now() > cached.expiresAt) {
      await kv.del(key)
      return { hit: false }
    }
    
    // Update hit count for analytics
    await this.incrementHitCount(key)
    
    return {
      hit: true,
      data: cached.data,
      cachedAt: cached.cachedAt
    }
  }
  
  async set<T>(
    operation: string,
    params: any,
    data: T,
    customTTL?: number
  ): Promise<void> {
    const key = this.generateKey(operation, params)
    const ttl = customTTL || this.ttl[operation] || 300
    
    const cached: CachedResponse<T> = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (ttl * 1000),
      hits: 0
    }
    
    await kv.setex(key, ttl, cached)
  }
  
  private generateKey(operation: string, params: any): string {
    const hash = createHash('sha256')
      .update(JSON.stringify({ operation, params }))
      .digest('hex')
    
    return `ai:cache:${operation}:${hash}`
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate all keys matching pattern
    const keys = await kv.keys(`ai:cache:${pattern}:*`)
    if (keys.length > 0) {
      await kv.del(...keys)
    }
  }
}
```

### 4. Performance Monitoring

**File to Create**: `lib/ai/monitoring/performance-monitor.ts`
```typescript
export class AIPerformanceMonitor {
  private metrics: Map<string, OperationMetrics> = new Map()
  
  async trackOperation<T>(
    operation: string,
    metadata: Record<string, any>,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()
    
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      const memoryDelta = this.calculateMemoryDelta(startMemory)
      
      await this.recordSuccess(operation, duration, memoryDelta, metadata)
      
      // Alert if slow
      if (duration > this.getThreshold(operation)) {
        await this.alertSlowOperation(operation, duration, metadata)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      await this.recordFailure(operation, duration, error, metadata)
      throw error
    }
  }
  
  async getMetrics(operation?: string): Promise<OperationMetrics[]> {
    if (operation) {
      return [this.metrics.get(operation)!].filter(Boolean)
    }
    return Array.from(this.metrics.values())
  }
  
  private getThreshold(operation: string): number {
    const thresholds = {
      'chat': 5000,
      'image-generation': 15000,
      'evaluation': 3000,
      'tool-execution': 2000
    }
    return thresholds[operation] || 5000
  }
  
  async generateReport(): Promise<PerformanceReport> {
    const metrics = await this.getMetrics()
    
    return {
      summary: {
        totalOperations: metrics.reduce((sum, m) => sum + m.count, 0),
        averageLatency: this.calculateAverageLatency(metrics),
        errorRate: this.calculateErrorRate(metrics),
        slowOperations: metrics.filter(m => m.p95 > this.getThreshold(m.operation))
      },
      byOperation: metrics.map(m => ({
        operation: m.operation,
        count: m.count,
        successRate: m.successRate,
        latency: {
          p50: m.p50,
          p95: m.p95,
          p99: m.p99
        }
      })),
      recommendations: await this.generateRecommendations(metrics)
    }
  }
}
```

### 5. Request Queuing System

**File to Create**: `lib/ai/queuing/request-queue.ts`
```typescript
import { Queue } from 'bullmq'

export class AIRequestQueue {
  private queues: Map<string, Queue>
  
  constructor() {
    this.queues = new Map([
      ['high-priority', new Queue('ai-high-priority', {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      })],
      ['normal', new Queue('ai-normal', {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 2
        }
      })],
      ['batch', new Queue('ai-batch', {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 1
        }
      })]
    ])
  }
  
  async enqueue(
    request: AIRequest,
    priority: 'high' | 'normal' | 'batch' = 'normal'
  ): Promise<string> {
    const queue = this.queues.get(`${priority}-priority`) || this.queues.get('normal')!
    
    const job = await queue.add(request.type, request, {
      priority: this.getPriorityValue(priority),
      delay: request.scheduledFor ? request.scheduledFor - Date.now() : 0
    })
    
    return job.id!
  }
  
  async getQueueStatus(): Promise<QueueStatus> {
    const status: QueueStatus = {}
    
    for (const [name, queue] of this.queues) {
      const counts = await queue.getJobCounts()
      status[name] = {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed
      }
    }
    
    return status
  }
}
```

### 6. Cost Tracking

**File to Create**: `lib/ai/billing/cost-tracker.ts`
```typescript
export class AICostTracker {
  private costs = {
    'gpt-4o': { input: 0.01, output: 0.03 },
    'gpt-4o-vision': { input: 0.01, output: 0.03 },
    'dall-e-3': { '1024x1024': 0.04, '1792x1024': 0.08 },
    'dall-e-2': { '1024x1024': 0.02 }
  }
  
  async trackUsage(
    userId: string,
    model: string,
    usage: ModelUsage
  ): Promise<void> {
    const cost = this.calculateCost(model, usage)
    
    await db.aiUsage.create({
      data: {
        userId,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        images: usage.images,
        cost,
        timestamp: new Date()
      }
    })
    
    // Check if approaching limit
    const monthlyUsage = await this.getMonthlyUsage(userId)
    if (monthlyUsage.total > monthlyUsage.limit * 0.8) {
      await this.notifyApproachingLimit(userId, monthlyUsage)
    }
  }
  
  async getUsageReport(
    userId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<UsageReport> {
    const startDate = this.getStartDate(period)
    
    const usage = await db.aiUsage.groupBy({
      by: ['model'],
      where: {
        userId,
        timestamp: { gte: startDate }
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        images: true,
        cost: true
      },
      _count: true
    })
    
    return {
      period,
      totalCost: usage.reduce((sum, u) => sum + (u._sum.cost || 0), 0),
      byModel: usage.map(u => ({
        model: u.model,
        requests: u._count,
        cost: u._sum.cost || 0,
        tokens: (u._sum.inputTokens || 0) + (u._sum.outputTokens || 0)
      })),
      recommendations: await this.generateCostOptimizations(usage)
    }
  }
}
```

### 7. Graceful Degradation

**File to Create**: `lib/ai/fallback/degradation-handler.ts`
```typescript
export class DegradationHandler {
  private fallbackStrategies = new Map<string, FallbackStrategy[]>()
  
  constructor() {
    // Define fallback chains
    this.fallbackStrategies.set('image-generation', [
      { model: 'dall-e-3', quality: 'hd' },
      { model: 'dall-e-3', quality: 'standard' },
      { model: 'dall-e-2', quality: 'standard' },
      { model: 'stable-diffusion', quality: 'standard' }
    ])
    
    this.fallbackStrategies.set('chat', [
      { model: 'gpt-4o' },
      { model: 'gpt-4' },
      { model: 'gpt-3.5-turbo' }
    ])
  }
  
  async executeWithFallback<T>(
    operation: string,
    primaryFn: () => Promise<T>,
    context: DegradationContext
  ): Promise<T> {
    // Try primary
    try {
      return await primaryFn()
    } catch (error) {
      const strategies = this.fallbackStrategies.get(operation)
      if (!strategies) throw error
      
      // Try fallbacks
      for (const strategy of strategies) {
        try {
          const fallbackFn = this.createFallbackFunction(operation, strategy, context)
          const result = await fallbackFn()
          
          // Log degradation for monitoring
          await this.logDegradation(operation, strategy, context)
          
          return result
        } catch (fallbackError) {
          continue
        }
      }
      
      // All fallbacks failed
      throw new Error(`All fallback strategies failed for ${operation}`)
    }
  }
}
```

### 8. Security & Validation

**File to Create**: `lib/ai/security/input-validator.ts`
```typescript
export class AISecurityValidator {
  private blockedPatterns = [
    /\bignore\s+previous\s+instructions?\b/i,
    /\bsystem\s+prompt\b/i,
    /\bjailbreak\b/i
  ]
  
  async validateInput(
    input: string,
    context: SecurityContext
  ): Promise<ValidationResult> {
    // Check for prompt injection attempts
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(input)) {
        await this.logSecurityEvent('prompt_injection_attempt', context)
        return {
          valid: false,
          reason: 'Potentially harmful input detected',
          sanitized: this.sanitizeInput(input)
        }
      }
    }
    
    // Check content safety
    const safety = await this.checkContentSafety(input)
    if (!safety.safe) {
      return {
        valid: false,
        reason: safety.reason,
        categories: safety.categories
      }
    }
    
    // Rate limit by content hash to prevent spam
    const contentHash = this.hashContent(input)
    if (await this.isDuplicate(contentHash, context.userId)) {
      return {
        valid: false,
        reason: 'Duplicate request detected'
      }
    }
    
    return { valid: true }
  }
  
  async validateOutput(
    output: any,
    context: SecurityContext
  ): Promise<ValidationResult> {
    // Ensure no sensitive data leakage
    const sensitive = this.detectSensitiveData(output)
    if (sensitive.found) {
      await this.logSecurityEvent('sensitive_data_exposure', context)
      return {
        valid: false,
        reason: 'Output contains sensitive information',
        redacted: this.redactSensitive(output, sensitive.matches)
      }
    }
    
    return { valid: true }
  }
}
```

### 9. Health Checks

**File to Create**: `lib/ai/health/health-checker.ts`
```typescript
export class AIHealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkOpenAI(),
      this.checkRedis(),
      this.checkDatabase(),
      this.checkQueues(),
      this.checkRateLimit()
    ])
    
    const services = {
      openai: this.extractStatus(checks[0]),
      redis: this.extractStatus(checks[1]),
      database: this.extractStatus(checks[2]),
      queues: this.extractStatus(checks[3]),
      rateLimit: this.extractStatus(checks[4])
    }
    
    const allHealthy = Object.values(services).every(s => s.status === 'healthy')
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services,
      timestamp: new Date(),
      metrics: await this.getHealthMetrics()
    }
  }
  
  private async checkOpenAI(): Promise<ServiceHealth> {
    try {
      const start = Date.now()
      await openai.models.list()
      const latency = Date.now() - start
      
      return {
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
        message: 'OpenAI API accessible'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  }
}
```

### 10. Integration Updates

**File to Modify**: `app/api/ai/chat/route.ts`
```typescript
import { AIErrorHandler } from '@/lib/ai/errors/error-handler'
import { AIRateLimiter } from '@/lib/ai/rate-limiting/limiter'
import { AIResponseCache } from '@/lib/ai/caching/response-cache'
import { AIPerformanceMonitor } from '@/lib/ai/monitoring/performance-monitor'

const rateLimiter = new AIRateLimiter()
const cache = new AIResponseCache()
const monitor = new AIPerformanceMonitor()

export async function POST(req: Request) {
  const userId = await getUserId(req)
  
  // Rate limiting
  const rateLimit = await rateLimiter.checkLimit(userId, 'chat')
  if (!rateLimit.allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.reset.toISOString()
      }
    })
  }
  
  try {
    return await monitor.trackOperation('chat', { userId }, async () => {
      // Main chat logic with error handling
      return await AIErrorHandler.handleWithRetry(async () => {
        // ... existing chat implementation
      })
    })
  } catch (error) {
    const errorResponse = await AIErrorHandler.handle(error)
    return new Response(JSON.stringify(errorResponse), {
      status: errorResponse.code === 'RATE_LIMIT' ? 429 : 500
    })
  }
}
```

## Testing Requirements

**Files to Create**:
- `__tests__/ai/errors/error-handler.test.ts`
- `__tests__/ai/rate-limiting/limiter.test.ts`
- `__tests__/ai/monitoring/performance-monitor.test.ts`

## Success Criteria
1. 99.9% uptime for AI services
2. <5s p95 latency for chat responses
3. Graceful handling of all error scenarios
4. Cost tracking accurate to $0.01
5. Security validation blocks 100% of known attacks
6. Cache hit rate >30% for common operations

## Dependencies
- Redis for caching and rate limiting
- Monitoring service (Datadog/New Relic)
- Queue system (BullMQ)
- Database for usage tracking

## Estimated Effort
- 1 developer × 7-8 days
- Requires expertise in:
  - Production system design
  - Performance optimization
  - Security best practices
  - Monitoring and observability 