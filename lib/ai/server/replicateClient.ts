import Replicate from 'replicate'
import { AIServiceError, AIQuotaExceededError, AIServiceUnavailableError } from '../tools/base'

// Define proper types for Replicate API responses
type ReplicateOutput = string | string[] | Record<string, unknown> | Promise<unknown>

interface ReplicateRunOptions {
  input: Record<string, unknown>
  webhook?: string
}

interface ModelInfo {
  owner: string
  name: string
  description?: string
  visibility: string
  github_url?: string
  paper_url?: string
  license_url?: string
  cover_image_url?: string
}

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
    options: ReplicateRunOptions
  ): Promise<ReplicateOutput> {
    try {
      console.log(`[ServerReplicateClient] Running model: ${model}`)
      console.log(`[ServerReplicateClient] Input:`, options.input)
      
      const output = await this.client.run(model as `${string}/${string}` | `${string}/${string}:${string}`, {
        input: options.input,
        webhook: options.webhook
      })
      
      console.log(`[ServerReplicateClient] Raw output type:`, typeof output)
      console.log(`[ServerReplicateClient] Raw output:`, output)
      
      // Handle ReadableStream or other async responses
      if (output && typeof output === 'object' && 'then' in output) {
        console.log(`[ServerReplicateClient] Output is a Promise, awaiting...`)
        const resolved = await output
        console.log(`[ServerReplicateClient] Resolved output:`, resolved)
        return resolved as ReplicateOutput
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
      return output as ReplicateOutput
    } catch (error: unknown) {
      console.error('[ServerReplicateClient] Error running model:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const _errorCode = error instanceof Error && 'code' in error ? (error as { code?: string }).code : undefined
      
      // Parse common error types
      if (errorMessage.includes('rate limit')) {
        throw new AIQuotaExceededError('replicate')
      }
      
      if (errorMessage.includes('payment') || errorMessage.includes('credits')) {
        throw new AIQuotaExceededError('replicate')
      }
      
      if (errorMessage.includes('unavailable') || errorMessage.includes('timeout')) {
        throw new AIServiceUnavailableError('replicate')
      }
      
      // Generic AI service error
      throw new AIServiceError(
        errorMessage || 'Unknown error from Replicate API'
      )
    }
  }
  
  /**
   * Get model information
   */
  async getModel(model: string): Promise<ModelInfo> {
    try {
      const [owner, name] = model.split('/')
      const result = await this.client.models.get(owner, name)
      return result as ModelInfo
    } catch (error: unknown) {
      console.error('[ServerReplicateClient] Error getting model info:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const _errorCode = error instanceof Error && 'code' in error ? (error as { code?: string }).code : undefined
      
      throw new AIServiceError(
        `Failed to get model info: ${errorMessage}`
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