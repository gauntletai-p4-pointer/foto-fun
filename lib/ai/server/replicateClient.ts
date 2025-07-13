import Replicate from 'replicate'
import { AIServiceError, AIQuotaExceededError, AIServiceUnavailableError } from '../tools/base'

/**
 * Server-side Replicate client
 * Uses REPLICATE_API_KEY which is only accessible on the server
 */
class ServerReplicateClient {
  private client: Replicate
  private apiKey: string
  
  constructor() {
    this.apiKey = process.env.REPLICATE_API_KEY!
    
    if (!this.apiKey) {
      throw new Error('REPLICATE_API_KEY is required for server-side Replicate operations')
    }
    
    this.client = new Replicate({
      auth: this.apiKey,
    })
  }
  
  /**
   * Run a model prediction on the server
   */
  async run(
    model: string,
    options: {
      input: Record<string, unknown>
      webhook?: string
    }
  ): Promise<unknown> {
    console.log(`[ServerReplicateClient] Starting run for model: ${model}`)
    
    // Enhanced diagnostic logging for image identification issues
    if (options.input.image && typeof options.input.image === 'string') {
      const imageData = options.input.image as string
      console.log(`[ServerReplicateClient] ===== IMAGE DATA DIAGNOSTICS =====`)
      console.log(`[ServerReplicateClient] Image data validation:`, {
        type: typeof imageData,
        length: imageData.length,
        isDataURL: imageData.startsWith('data:image/'),
        format: imageData.substring(0, 30),
        hasBase64: imageData.includes(';base64,'),
        base64Length: imageData.includes(';base64,') ? imageData.split(';base64,')[1]?.length : 0
      })
      
      // Check for potential base64 corruption indicators
      if (imageData.includes(';base64,')) {
        const base64Part = imageData.split(';base64,')[1]
        console.log(`[ServerReplicateClient] Base64 corruption checks:`, {
          hasInvalidChars: !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Part),
          hasProperPadding: base64Part.endsWith('=') || base64Part.endsWith('==') || base64Part.length % 4 === 0,
          firstChars: base64Part.substring(0, 20),
          lastChars: base64Part.substring(base64Part.length - 20)
        })
      }
      
      if (imageData.startsWith('data:image/')) {
        console.log(`[ServerReplicateClient] Processing data URL image`)
        console.log(`[ServerReplicateClient] Data URL prefix:`, imageData.substring(0, 50))
      } else if (imageData.startsWith('http')) {
        console.log(`[ServerReplicateClient] Processing HTTP URL image:`, imageData)
      }
      console.log(`[ServerReplicateClient] ===== END IMAGE DATA ANALYSIS =====`)
    }

    // Log the complete input being sent to Replicate
    console.log(`[ServerReplicateClient] Complete input being sent to Replicate:`, {
      model,
      webhook: options.webhook,
      inputStructure: Object.fromEntries(
        Object.entries(options.input).map(([key, value]) => [
          key, 
          typeof value === 'string' && value.length > 100 
            ? `${typeof value} (${value.length} chars): ${value.substring(0, 30)}...`
            : value
        ])
      )
    })

    // Retry logic specifically for image identification errors
    const maxRetries = 3
    let retryCount = 0
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`[ServerReplicateClient] Attempt ${retryCount + 1}/${maxRetries + 1} - About to call this.client.run with model:`, model)
        console.log(`[ServerReplicateClient] Timestamp before API call:`, new Date().toISOString())
        
        const output = await this.client.run(model as `${string}/${string}` | `${string}/${string}:${string}`, {
          input: options.input,
          webhook: options.webhook
        })
        
        console.log(`[ServerReplicateClient] Timestamp after API call:`, new Date().toISOString())
        console.log(`[ServerReplicateClient] API call completed successfully on attempt ${retryCount + 1}`)
        console.log(`[ServerReplicateClient] Raw output type:`, typeof output)
        console.log(`[ServerReplicateClient] Raw output constructor:`, output?.constructor?.name)
        console.log(`[ServerReplicateClient] Raw output:`, output)
        
        // Handle ReadableStream or other async responses
        if (output && typeof output === 'object' && 'then' in output) {
          console.log(`[ServerReplicateClient] Output is a Promise, awaiting...`)
          const resolved = await output
          console.log(`[ServerReplicateClient] Resolved output:`, resolved)
          return resolved
        }
        
        // Handle array of ReadableStreams (binary image data)
        if (Array.isArray(output) && output.length > 0) {
          const firstItem = output[0]
          if (firstItem && typeof firstItem === 'object' && 'locked' in firstItem && 'getReader' in firstItem) {
            console.log(`[ServerReplicateClient] First item is ReadableStream, reading binary data...`)
            
            try {
              const reader = (firstItem as ReadableStream<Uint8Array>).getReader()
              const chunks: Uint8Array[] = []
              
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                chunks.push(value)
              }
              
              // Combine all chunks into a single Uint8Array
              const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
              const combinedArray = new Uint8Array(totalLength)
              let offset = 0
              
              for (const chunk of chunks) {
                combinedArray.set(chunk, offset)
                offset += chunk.length
              }
              
              console.log(`[ServerReplicateClient] Binary data read successfully: ${combinedArray.length} bytes`)
              return combinedArray
            } catch (streamError) {
              console.error(`[ServerReplicateClient] Error reading stream:`, streamError)
              throw streamError
            }
          }
        }
        
        return output
        
      } catch (err: any) {
        console.error(`[ServerReplicateClient] Attempt ${retryCount + 1} failed:`, err.message)
        
        // Check if this is the specific image identification error
        const isImageIdentificationError = err.message?.includes('cannot identify image file')
        
        if (isImageIdentificationError && retryCount < maxRetries) {
          console.log(`[ServerReplicateClient] Image identification error detected, retrying...`)
          console.log(`[ServerReplicateClient] Error details:`, {
            message: err.message,
            retryCount: retryCount + 1,
            maxRetries
          })
          
          // Exponential backoff: wait before retrying
          const waitTime = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
          console.log(`[ServerReplicateClient] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          
          retryCount++
          continue
        }
        
        // If it's not the image identification error or we've exhausted retries, handle the error
        console.error(`[ServerReplicateClient] Final error after ${retryCount + 1} attempts:`, err)
        console.error(`[ServerReplicateClient] Error type:`, typeof err)
        console.error(`[ServerReplicateClient] Error constructor:`, err.constructor?.name)
        console.error(`[ServerReplicateClient] Error message:`, err.message)
        
        if (err.stack) {
          console.error('[ServerReplicateClient] Error stack:', err.stack)
        }
        
        // Log detailed error information for debugging
        console.error('[ServerReplicateClient] Model that failed:', model)
        console.error('[ServerReplicateClient] Input keys that were sent:', Object.keys(options.input))
        console.error('[ServerReplicateClient] Timestamp of failure:', new Date().toISOString())
        
        // Parse common error types
        if (err.message?.includes('rate limit')) {
          console.error('[ServerReplicateClient] Rate limit error detected')
          throw new AIQuotaExceededError('replicate', err.message)
        }
        
        if (err.message?.includes('payment') || err.message?.includes('credits')) {
          console.error('[ServerReplicateClient] Payment/credits error detected')
          throw new AIQuotaExceededError('replicate', err.message)
        }
        
        if (err.message?.includes('unavailable') || err.message?.includes('timeout')) {
          console.error('[ServerReplicateClient] Unavailable/timeout error detected')
          throw new AIServiceUnavailableError('replicate', err.message)
        }
        
        if (err.message?.includes('cannot identify image file')) {
          console.error('[ServerReplicateClient] Image identification error - detailed analysis:')
          console.error('[ServerReplicateClient] This error typically means:')
          console.error('[ServerReplicateClient] 1. Image format is not supported by the model')
          console.error('[ServerReplicateClient] 2. Image data is corrupted or invalid')
          console.error('[ServerReplicateClient] 3. Base64 encoding is malformed')
          console.error('[ServerReplicateClient] 4. Model-specific requirements not met')
          console.error('[ServerReplicateClient] 5. Temporary file race condition (now handled with retries)')
          
          // If we have image data, log additional debugging info
          if (options.input.image) {
            const imageData = options.input.image as string
            console.error('[ServerReplicateClient] Image data debugging info:')
            console.error('[ServerReplicateClient] - Type:', typeof imageData)
            console.error('[ServerReplicateClient] - Length:', imageData.length)
            console.error('[ServerReplicateClient] - Starts with data:image/:', imageData.startsWith('data:image/'))
            console.error('[ServerReplicateClient] - Has base64 header:', imageData.includes(';base64,'))
            console.error('[ServerReplicateClient] - Format prefix:', imageData.substring(0, 30))
            console.error('[ServerReplicateClient] - All retries exhausted')
          }
        }
        
        // Generic AI service error
        throw new AIServiceError(
          err.message || 'Unknown error from Replicate API',
          'replicate',
          err.code,
          err
        )
      }
    }
    
    // This should never be reached due to the throw in the catch block
    throw new Error('Unexpected end of retry loop')
  }
  
  /**
   * Get model information
   */
  async getModel(model: string): Promise<unknown> {
    try {
      const [owner, name] = model.split('/')
      return await this.client.models.get(owner, name)
    } catch (error) {
      const err = error as Error & { message?: string; code?: string }
      console.error('[ServerReplicateClient] Error getting model info:', error)
      
      throw new AIServiceError(
        `Failed to get model info: ${err.message}`,
        'replicate',
        err.code,
        err
      )
    }
  }
  
  /**
   * Check if the API key is valid
   */
  async isConfigured(): Promise<boolean> {
    try {
      await this.client.models.get('stability-ai', 'sdxl')
      return true
    } catch (error) {
      console.error('[ServerReplicateClient] API key validation failed:', error)
      return false
    }
  }
}

// Singleton instance for server-side use
export const serverReplicateClient = new ServerReplicateClient() 