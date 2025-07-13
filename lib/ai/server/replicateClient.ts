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
    try {
      console.log(`[ServerReplicateClient] ===== STARTING MODEL EXECUTION =====`)
      console.log(`[ServerReplicateClient] Running model: ${model}`)
      console.log(`[ServerReplicateClient] Input keys:`, Object.keys(options.input))
      console.log(`[ServerReplicateClient] Input types:`, Object.fromEntries(
        Object.entries(options.input).map(([key, value]) => [key, typeof value])
      ))
      
      // Special handling for image data
      if (options.input.image) {
        const imageData = options.input.image as string
        console.log(`[ServerReplicateClient] ===== IMAGE DATA ANALYSIS =====`)
        console.log(`[ServerReplicateClient] Image data type:`, typeof imageData)
        console.log(`[ServerReplicateClient] Image data length:`, imageData.length)
        console.log(`[ServerReplicateClient] Image data prefix:`, imageData.substring(0, 50) + '...')
        
        if (imageData.startsWith('data:image/')) {
          console.log(`[ServerReplicateClient] Processing data URL image`)
          const base64Index = imageData.indexOf(';base64,')
          if (base64Index !== -1) {
            const mimeType = imageData.substring(0, base64Index)
            const base64Data = imageData.substring(base64Index + 8)
            console.log(`[ServerReplicateClient] MIME type:`, mimeType)
            console.log(`[ServerReplicateClient] Base64 data length:`, base64Data.length)
            console.log(`[ServerReplicateClient] Base64 data prefix:`, base64Data.substring(0, 50))
            console.log(`[ServerReplicateClient] Base64 data suffix:`, base64Data.substring(base64Data.length - 50))
            
            // Test base64 validity
            try {
              const decoded = atob(base64Data.substring(0, 100))
              console.log(`[ServerReplicateClient] Base64 test decode successful:`, decoded.length, 'bytes')
              
              // Check file signature
              const firstBytes = decoded.substring(0, 8)
              const firstBytesHex = Array.from(firstBytes).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')
              console.log(`[ServerReplicateClient] First 8 bytes as hex:`, firstBytesHex)
              
              const isPNG = firstBytes.charCodeAt(0) === 0x89 && firstBytes.charCodeAt(1) === 0x50
              const isJPEG = firstBytes.charCodeAt(0) === 0xFF && firstBytes.charCodeAt(1) === 0xD8
              console.log(`[ServerReplicateClient] File signature check:`, { isPNG, isJPEG })
              
            } catch (decodeError) {
              console.error(`[ServerReplicateClient] Base64 decode test failed:`, decodeError)
            }
          }
        } else {
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
      
      console.log(`[ServerReplicateClient] About to call this.client.run with model:`, model)
      console.log(`[ServerReplicateClient] Timestamp before API call:`, new Date().toISOString())
      
      const output = await this.client.run(model as `${string}/${string}` | `${string}/${string}:${string}`, {
        input: options.input,
        webhook: options.webhook
      })
      
      console.log(`[ServerReplicateClient] Timestamp after API call:`, new Date().toISOString())
      console.log(`[ServerReplicateClient] API call completed successfully`)
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
            
            console.log(`[ServerReplicateClient] Read ${combinedArray.length} bytes of binary data`)
            
            // Check if this looks like image data (PNG starts with specific bytes)
            const isPNG = combinedArray.length > 8 && 
                         combinedArray[0] === 0x89 && 
                         combinedArray[1] === 0x50 && 
                         combinedArray[2] === 0x4E && 
                         combinedArray[3] === 0x47
            
            if (isPNG) {
              // Convert binary data to base64 data URL using Node.js Buffer (more efficient)
              console.log(`[ServerReplicateClient] Converting ${combinedArray.length} bytes to base64...`)
              
              // Use Node.js Buffer for efficient base64 conversion
              const buffer = Buffer.from(combinedArray)
              const base64 = buffer.toString('base64')
              const dataUrl = `data:image/png;base64,${base64}`
              
              console.log(`[ServerReplicateClient] Converted PNG to data URL (${base64.length} chars)`)
              return [dataUrl]
            } else {
              // Try to decode as text (might be a URL)
              const decoder = new TextDecoder()
              const textResult = decoder.decode(combinedArray).trim()
              console.log(`[ServerReplicateClient] Decoded as text:`, textResult.substring(0, 100) + '...')
              
              // Try to parse as JSON
              try {
                const parsed = JSON.parse(textResult)
                return Array.isArray(parsed) ? parsed : [parsed.url || parsed]
              } catch {
                // Treat as URL directly
                return [textResult]
              }
            }
          } catch (streamError) {
            console.error(`[ServerReplicateClient] Error reading stream:`, streamError)
            throw new Error(`Failed to read image stream: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`)
          }
        }
      }
      
      console.log(`[ServerReplicateClient] Final output:`, output)
      return output
    } catch (error) {
      console.error('[ServerReplicateClient] ===== ERROR OCCURRED =====')
      console.error('[ServerReplicateClient] Error running model:', error)
      console.error('[ServerReplicateClient] Error type:', typeof error)
      console.error('[ServerReplicateClient] Error constructor:', error?.constructor?.name)
      
      const err = error as Error & { message?: string; code?: string }
      
      if (err instanceof Error) {
        console.error('[ServerReplicateClient] Error message:', err.message)
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
        
        // If we have image data, log additional debugging info
        if (options.input.image) {
          const imageData = options.input.image as string
          console.error('[ServerReplicateClient] Image data debugging info:')
          console.error('[ServerReplicateClient] - Type:', typeof imageData)
          console.error('[ServerReplicateClient] - Length:', imageData.length)
          console.error('[ServerReplicateClient] - Starts with data:image/:', imageData.startsWith('data:image/'))
          console.error('[ServerReplicateClient] - Has base64 header:', imageData.includes(';base64,'))
          console.error('[ServerReplicateClient] - Format prefix:', imageData.substring(0, 30))
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