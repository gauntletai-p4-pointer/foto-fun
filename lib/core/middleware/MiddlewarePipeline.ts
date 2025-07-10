/**
 * Middleware function type
 * @param context - The context object passed through the pipeline
 * @param next - Function to call the next middleware
 */
export type Middleware<TContext> = (
  context: TContext,
  next: () => Promise<void>
) => Promise<void>

/**
 * Middleware pipeline for handling cross-cutting concerns
 * Allows composing multiple middleware functions into a single pipeline
 */
export class MiddlewarePipeline<TContext> {
  private middlewares: Middleware<TContext>[] = []
  
  /**
   * Add a middleware to the pipeline
   */
  use(middleware: Middleware<TContext>): this {
    this.middlewares.push(middleware)
    return this
  }
  
  /**
   * Add multiple middlewares at once
   */
  useMany(...middlewares: Middleware<TContext>[]): this {
    this.middlewares.push(...middlewares)
    return this
  }
  
  /**
   * Insert middleware at a specific position
   */
  insert(index: number, middleware: Middleware<TContext>): this {
    this.middlewares.splice(index, 0, middleware)
    return this
  }
  
  /**
   * Remove a middleware from the pipeline
   */
  remove(middleware: Middleware<TContext>): this {
    const index = this.middlewares.indexOf(middleware)
    if (index !== -1) {
      this.middlewares.splice(index, 1)
    }
    return this
  }
  
  /**
   * Clear all middlewares
   */
  clear(): this {
    this.middlewares = []
    return this
  }
  
  /**
   * Get the number of middlewares in the pipeline
   */
  get length(): number {
    return this.middlewares.length
  }
  
  /**
   * Execute the middleware pipeline
   * @param context - The context to pass through the pipeline
   * @param final - The final handler to execute after all middlewares
   */
  async execute(context: TContext, final: () => Promise<void>): Promise<void> {
    let index = 0
    
    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        return final()
      }
      
      const middleware = this.middlewares[index++]
      return middleware(context, next)
    }
    
    return next()
  }
  
  /**
   * Create a composed middleware from this pipeline
   * Useful for nesting pipelines
   */
  compose(): Middleware<TContext> {
    return async (context: TContext, next: () => Promise<void>) => {
      await this.execute(context, next)
    }
  }
  
  /**
   * Clone the pipeline
   */
  clone(): MiddlewarePipeline<TContext> {
    const pipeline = new MiddlewarePipeline<TContext>()
    pipeline.middlewares = [...this.middlewares]
    return pipeline
  }
}

/**
 * Common middleware implementations
 */
// Using CommonMiddleware as an object instead of namespace to avoid lint error
export const CommonMiddleware = {
  /**
   * Logging middleware
   */
  logging<T extends { name?: string }>(
    logger: (message: string, context: T) => void = console.log
  ): Middleware<T> {
    return async (context, next) => {
      const name = context.name || 'Operation'
      const start = Date.now()
      
      logger(`[${name}] Started`, context)
      
      try {
        await next()
        const duration = Date.now() - start
        logger(`[${name}] Completed in ${duration}ms`, context)
      } catch (error) {
        const duration = Date.now() - start
        logger(`[${name}] Failed after ${duration}ms: ${error}`, context)
        throw error
      }
    }
  },
  
  /**
   * Error handling middleware
   */
  errorHandler<T>(
    handler: (error: Error, context: T) => void | Promise<void>
  ): Middleware<T> {
    return async (context, next) => {
      try {
        await next()
      } catch (error) {
        await handler(error as Error, context)
        throw error
      }
    }
  },
  
  /**
   * Retry middleware
   */
  retry<T>(
    maxAttempts: number = 3,
    delay: number = 1000,
    shouldRetry: (error: Error) => boolean = () => true
  ): Middleware<T> {
    return async (context, next) => {
      let lastError: Error
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await next()
          return
        } catch (error) {
          lastError = error as Error
          
          if (attempt === maxAttempts || !shouldRetry(lastError)) {
            throw lastError
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        }
      }
      
      throw lastError!
    }
  },
  
  /**
   * Timeout middleware
   */
  timeout<T>(ms: number): Middleware<T> {
    return async (context, next) => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
      })
      
      await Promise.race([next(), timeoutPromise])
    }
  },
  
  /**
   * Validation middleware
   */
  validation<T>(
    validate: (context: T) => void | Promise<void>
  ): Middleware<T> {
    return async (context, next) => {
      await validate(context)
      await next()
    }
  },
  
  /**
   * Performance tracking middleware
   */
  performance<T extends { metrics?: Record<string, number> }>(
    metricName: string = 'duration'
  ): Middleware<T> {
    return async (context, next) => {
      const start = globalThis.performance.now()
      
      try {
        await next()
      } finally {
        const duration = globalThis.performance.now() - start
        
        if (!context.metrics) {
          context.metrics = {}
        }
        
        context.metrics[metricName] = duration
      }
    }
  },
  
  /**
   * Caching middleware
   */
  cache<T extends { cacheKey?: string; cached?: boolean }>(
    cacheStore: Map<string, unknown>,
    keyGenerator: (context: T) => string
  ): Middleware<T> {
    return async (context, next) => {
      const key = keyGenerator(context)
      context.cacheKey = key
      
      // Check cache
      if (cacheStore.has(key)) {
        context.cached = true
        return
      }
      
      // Execute and cache
      context.cached = false
      await next()
      
      // Store in cache (you might want to store the result somehow)
      cacheStore.set(key, true)
    }
  }
} 