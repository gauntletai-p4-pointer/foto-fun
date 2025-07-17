import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'

// Input validation schema - Bria remove-background parameters
const removeBackgroundSchema = z.object({
  image: z.string().min(1, 'Image data is required').refine(
    (value) => value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://'),
    'Must be a valid image URL or data URL'
  )
})

// Using Bria remove-background model
const REMOVE_BACKGROUND_MODEL_ID = 'bria/remove-background'

export async function POST(req: NextRequest) {
  try {
    console.log('[Remove Background API] ===== STARTING BACKGROUND REMOVAL PROCESS =====')
    console.log('[Remove Background API] Processing request...')
    
    // Parse and validate request body
    const body = await req.json()
    console.log('[Remove Background API] Request body keys:', Object.keys(body))
    console.log('[Remove Background API] Request body image field type:', typeof body.image)
    
    const params = removeBackgroundSchema.parse(body)
    
    console.log('[Remove Background API] Validated params:', {
      imageUrlType: typeof params.image,
      imageUrlLength: params.image?.length,
      imageUrlPrefix: params.image?.substring(0, 50) + '...'
    })
    
    // Check for extremely large images that might cause memory issues
    const maxImageSize = 10 * 1024 * 1024 // 10MB limit
    if (params.image.length > maxImageSize) {
      console.warn('[Remove Background API] Image size exceeds limit:', {
        imageSize: params.image.length,
        maxSize: maxImageSize,
        sizeMB: Math.round(params.image.length / 1024 / 1024 * 100) / 100
      })
      return NextResponse.json(
        { 
          error: 'Image size is too large. Please use an image smaller than 10MB.',
          details: 'Large images can cause processing issues. Try reducing the image size or quality.'
        },
        { status: 400 }
      )
    }
    
    // ===== DETAILED IMAGE VALIDATION =====
    console.log('[Remove Background API] ===== DETAILED IMAGE VALIDATION STARTS =====')
    
    // Additional validation for image format
    if (!params.image.startsWith('data:image/') && !params.image.startsWith('http')) {
      console.error('[Remove Background API] Invalid image format - not a data URL or HTTP URL')
      return NextResponse.json(
        { error: 'Invalid image format. Expected data URL or HTTP URL.' },
        { status: 400 }
      )
    }
    
    // Check if it's a data URL and validate format
    if (params.image.startsWith('data:image/')) {
      console.log('[Remove Background API] Processing data URL image...')
      
      const supportedFormats = ['data:image/png', 'data:image/jpeg', 'data:image/jpg']
      const isSupported = supportedFormats.some(format => params.image.startsWith(format))
      
      console.log('[Remove Background API] Image format check:', {
        fullPrefix: params.image.substring(0, 20),
        isPNG: params.image.startsWith('data:image/png'),
        isJPEG: params.image.startsWith('data:image/jpeg'),
        isJPG: params.image.startsWith('data:image/jpg'),
        isSupported
      })
      
      if (!isSupported) {
        console.error('[Remove Background API] Unsupported image format:', params.image.substring(0, 30))
        return NextResponse.json(
          { error: 'Unsupported image format. Please use PNG or JPEG for best compatibility.' },
          { status: 400 }
        )
      }
      
      // Check if the data URL has valid base64 content
      const base64Index = params.image.indexOf(';base64,')
      console.log('[Remove Background API] Base64 header check:', {
        base64Index,
        hasBase64Header: base64Index !== -1,
        headerPortion: params.image.substring(0, base64Index + 10)
      })
      
      if (base64Index === -1) {
        console.error('[Remove Background API] Invalid data URL - missing base64 header')
        return NextResponse.json(
          { error: 'Invalid data URL format.' },
          { status: 400 }
        )
      }
      
      const base64Data = params.image.substring(base64Index + 8)
      console.log('[Remove Background API] Base64 data analysis:', {
        base64DataLength: base64Data.length,
        base64DataPrefix: base64Data.substring(0, 50),
        base64DataSuffix: base64Data.substring(base64Data.length - 50),
        hasValidLength: base64Data.length >= 100
      })
      
      if (!base64Data || base64Data.length < 100) {
        console.error('[Remove Background API] Invalid data URL - insufficient data')
        return NextResponse.json(
          { error: 'Invalid or corrupted image data.' },
          { status: 400 }
        )
      }
      
      // Check if image is too large (> 8MB base64)
      const imageSizeMB = Math.round(base64Data.length / 1024 / 1024 * 100) / 100
      console.log('[Remove Background API] Image size analysis:', {
        base64Length: base64Data.length,
        sizeMB: imageSizeMB,
        isWithinLimit: base64Data.length <= 8_000_000
      })
      
      if (base64Data.length > 8_000_000) {
        console.error('[Remove Background API] Image too large:', base64Data.length)
        return NextResponse.json(
          { error: 'Image is too large. Please use a smaller image (under 8MB).' },
          { status: 400 }
        )
      }
      
      // ===== COMPREHENSIVE BASE64 VALIDATION =====
      console.log('[Remove Background API] ===== COMPREHENSIVE BASE64 VALIDATION =====')
      
      // Test base64 decoding in chunks
      try {
        console.log('[Remove Background API] Testing base64 decoding in chunks...')
        
        // Test first 100 characters
        const firstChunk = base64Data.substring(0, 100)
        const decodedFirst = atob(firstChunk)
        console.log('[Remove Background API] First chunk decode successful:', decodedFirst.length, 'bytes')
        
        // Test middle chunk
        const middleStart = Math.floor(base64Data.length / 2) - 50
        const middleChunk = base64Data.substring(middleStart, middleStart + 100)
        const decodedMiddle = atob(middleChunk)
        console.log('[Remove Background API] Middle chunk decode successful:', decodedMiddle.length, 'bytes')
        
        // Test last chunk
        const lastChunk = base64Data.substring(base64Data.length - 100)
        const decodedLast = atob(lastChunk)
        console.log('[Remove Background API] Last chunk decode successful:', decodedLast.length, 'bytes')
        
        // Test full decode (this might be expensive but necessary for validation)
        console.log('[Remove Background API] Testing full base64 decode...')
        const fullDecode = atob(base64Data)
        console.log('[Remove Background API] Full decode successful:', fullDecode.length, 'bytes')
        
        // ===== BINARY DATA VALIDATION =====
        console.log('[Remove Background API] ===== BINARY DATA VALIDATION =====')
        
        // Check file signature
        const firstBytes = fullDecode.substring(0, 8)
        const firstBytesHex = Array.from(firstBytes).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')
        console.log('[Remove Background API] First 8 bytes as hex:', firstBytesHex)
        
        // Check for PNG signature
        const isPNGSignature = firstBytes.charCodeAt(0) === 0x89 && 
                              firstBytes.charCodeAt(1) === 0x50 && 
                              firstBytes.charCodeAt(2) === 0x4E && 
                              firstBytes.charCodeAt(3) === 0x47 &&
                              firstBytes.charCodeAt(4) === 0x0D &&
                              firstBytes.charCodeAt(5) === 0x0A &&
                              firstBytes.charCodeAt(6) === 0x1A &&
                              firstBytes.charCodeAt(7) === 0x0A
        
        // Check for JPEG signature
        const isJPEGSignature = firstBytes.charCodeAt(0) === 0xFF && 
                               firstBytes.charCodeAt(1) === 0xD8 && 
                               firstBytes.charCodeAt(2) === 0xFF
        
        console.log('[Remove Background API] File signature validation:', {
          isPNGSignature,
          isJPEGSignature,
          hasValidSignature: isPNGSignature || isJPEGSignature
        })
        
        if (!isPNGSignature && !isJPEGSignature) {
          console.error('[Remove Background API] Invalid file signature - not a valid PNG or JPEG')
          return NextResponse.json(
            { error: 'Invalid image file format. The image data does not contain a valid PNG or JPEG signature.' },
            { status: 400 }
          )
        }
        
        // Additional validation for PNG
        if (isPNGSignature) {
          console.log('[Remove Background API] PNG-specific validation...')
          // Check for IHDR chunk (should be at bytes 8-21)
          if (fullDecode.length > 21) {
            const ihdrMarker = fullDecode.substring(8, 12)
            console.log('[Remove Background API] IHDR marker:', ihdrMarker)
            
            if (ihdrMarker !== 'IHDR') {
              console.warn('[Remove Background API] Warning: PNG missing IHDR chunk - might be corrupted')
            }
          }
        }
        
        // Additional validation for JPEG
        if (isJPEGSignature) {
          console.log('[Remove Background API] JPEG-specific validation...')
          // Check for JFIF or EXIF markers
          const hasJFIF = fullDecode.includes('JFIF')
          const hasEXIF = fullDecode.includes('Exif')
          console.log('[Remove Background API] JPEG markers:', { hasJFIF, hasEXIF })
        }
        
        console.log('[Remove Background API] ===== IMAGE VALIDATION COMPLETE - ALL CHECKS PASSED =====')
        
      } catch (base64Error) {
        console.error('[Remove Background API] Base64 validation failed:', base64Error)
        console.error('[Remove Background API] Base64 error details:', {
          error: base64Error instanceof Error ? base64Error.message : String(base64Error),
          base64Length: base64Data.length,
          base64Sample: base64Data.substring(0, 100)
        })
        return NextResponse.json(
          { error: 'Invalid base64 image data - corrupted or malformed.' },
          { status: 400 }
        )
      }
      
      console.log('[Remove Background API] Image format validation passed')
    } else {
      console.log('[Remove Background API] Processing HTTP URL image:', params.image)
    }
    
    // ===== PREPARE REPLICATE INPUT =====
    console.log('[Remove Background API] ===== PREPARING REPLICATE INPUT =====')
    
    // Enhanced base64 validation and cleansing for Replicate API
    let cleanedImageData = params.image
    
    if (params.image.startsWith('data:image/')) {
      console.log('[Remove Background API] Performing enhanced base64 validation and cleansing...')
      
      const base64Index = params.image.indexOf(';base64,')
      if (base64Index !== -1) {
        const mimeType = params.image.substring(0, base64Index)
        let base64Data = params.image.substring(base64Index + 8)
        
        console.log('[Remove Background API] Base64 cleansing process:', {
          originalLength: base64Data.length,
          mimeType,
          lastChars: base64Data.substring(base64Data.length - 10)
        })
        
        // Clean and validate base64 data
        try {
          // Remove any whitespace characters that might have been introduced
          base64Data = base64Data.replace(/\s/g, '')
          
          // Check for proper base64 character set
          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
          if (!base64Regex.test(base64Data)) {
            console.warn('[Remove Background API] Invalid characters found in base64 data')
            // Remove invalid characters
            base64Data = base64Data.replace(/[^A-Za-z0-9+/=]/g, '')
          }
          
          // Ensure proper padding
          const paddingNeeded = 4 - (base64Data.length % 4)
          if (paddingNeeded !== 4 && paddingNeeded > 0) {
            console.log('[Remove Background API] Adding padding to base64 data:', paddingNeeded)
            base64Data += '='.repeat(paddingNeeded)
          }
          
          // Test decode to validate the data
          const testDecodeLength = Math.min(100, base64Data.length)
          const testDecode = atob(base64Data.substring(0, testDecodeLength))
          
          console.log('[Remove Background API] Base64 validation successful:', {
            cleanedLength: base64Data.length,
            testDecodeLength: testDecode.length,
            paddingAdded: paddingNeeded > 0 ? paddingNeeded : 0
          })
          
          // Reconstruct the cleaned data URL
          cleanedImageData = `${mimeType};base64,${base64Data}`
          
          // Additional validation: check file signature after cleaning
          const fullTestDecode = atob(base64Data.substring(0, Math.min(200, base64Data.length)))
          const firstBytes = fullTestDecode.substring(0, 8)
          const isPNG = firstBytes.charCodeAt(0) === 0x89 && firstBytes.charCodeAt(1) === 0x50
          const isJPEG = firstBytes.charCodeAt(0) === 0xFF && firstBytes.charCodeAt(1) === 0xD8
          
          console.log('[Remove Background API] Cleaned data file signature check:', {
            isPNG,
            isJPEG,
            hasValidSignature: isPNG || isJPEG
          })
          
          if (!isPNG && !isJPEG) {
            console.error('[Remove Background API] Cleaned data still has invalid file signature')
            return NextResponse.json(
              { error: 'Image data appears to be corrupted even after cleaning. Please try re-uploading the image.' },
              { status: 400 }
            )
          }
          
        } catch (cleaningError) {
          console.error('[Remove Background API] Base64 cleaning failed:', cleaningError)
          return NextResponse.json(
            { error: 'Failed to clean base64 image data. The image may be corrupted.' },
            { status: 400 }
          )
        }
      }
    }
    
    // Additional race condition mitigation: ensure the data is stable
    console.log('[Remove Background API] Final pre-send validation...')
    
    // Validate the final cleaned data
    if (cleanedImageData.startsWith('data:image/')) {
      const finalBase64Index = cleanedImageData.indexOf(';base64,')
      if (finalBase64Index !== -1) {
        const finalBase64Data = cleanedImageData.substring(finalBase64Index + 8)
        
        // Final validation checks
        console.log('[Remove Background API] Final validation checks:', {
          hasValidLength: finalBase64Data.length >= 100,
          hasValidPadding: finalBase64Data.length % 4 === 0,
          hasValidChars: /^[A-Za-z0-9+/]*={0,2}$/.test(finalBase64Data),
          endsWithPadding: finalBase64Data.endsWith('=') || finalBase64Data.endsWith('==') || finalBase64Data.length % 4 === 0
        })
        
        if (finalBase64Data.length < 100) {
          console.error('[Remove Background API] Final validation failed - data too short')
          return NextResponse.json(
            { error: 'Image data is too short after cleaning. Please try with a different image.' },
            { status: 400 }
          )
        }
      }
    }
    
    // Prepare input for Replicate API with Bria remove-background parameters
    const replicateInput = {
      image: cleanedImageData
    }
    
    console.log('[Remove Background API] Sending cleaned data to Bria remove-background:', {
      model: REMOVE_BACKGROUND_MODEL_ID,
      imageType: cleanedImageData.startsWith('data:') ? 'data_url' : 'url',
      imageSize: cleanedImageData.length,
      originalSize: params.image.length,
      dataCleaned: cleanedImageData !== params.image,
      inputKeys: Object.keys(replicateInput),
      inputImageType: typeof replicateInput.image,
      inputImagePrefix: replicateInput.image.substring(0, 50) + '...'
    })
    
    // ===== ADDITIONAL DEBUGGING FOR REPLICATE =====
    console.log('[Remove Background API] ===== ADDITIONAL DEBUGGING FOR REPLICATE =====')
    console.log('[Remove Background API] About to call serverReplicateClient.run with:', {
      modelId: REMOVE_BACKGROUND_MODEL_ID,
      inputType: typeof replicateInput,
      inputKeys: Object.keys(replicateInput),
      imageField: {
        type: typeof replicateInput.image,
        length: replicateInput.image?.length,
        startsWithData: replicateInput.image?.startsWith('data:'),
        format: replicateInput.image?.substring(0, 30)
      }
    })
    
    // Call Replicate API through server client
    const startTime = Date.now()
    console.log('[Remove Background API] Calling serverReplicateClient.run at:', new Date().toISOString())
    
    const output = await serverReplicateClient.run(REMOVE_BACKGROUND_MODEL_ID, {
      input: replicateInput
    })
    
    const processingTime = Date.now() - startTime
    console.log('[Remove Background API] serverReplicateClient.run completed in:', processingTime, 'ms')
    
    console.log('[Remove Background API] Background removal completed in', processingTime, 'ms')
    console.log('[Remove Background API] Raw output type:', typeof output)
    console.log('[Remove Background API] Raw output constructor:', output?.constructor?.name)
    
    // Handle output from Bria remove-background model
    let imageUrl: string
    
    if (output instanceof Uint8Array) {
      console.log('[Remove Background API] Output is Uint8Array (processed by ServerReplicateClient), converting to data URL...')
      console.log('[Remove Background API] Binary data size:', output.length, 'bytes')
      
      // Convert Uint8Array to base64 data URL
      const base64 = Buffer.from(output).toString('base64')
      imageUrl = `data:image/png;base64,${base64}`
      
      console.log('[Remove Background API] Converted to data URL, length:', imageUrl.length)
      
    } else if (output instanceof ReadableStream) {
      console.log('[Remove Background API] Output is ReadableStream, converting to data URL...')
      
      // Convert ReadableStream to Buffer
      const reader = output.getReader()
      const chunks: Uint8Array[] = []
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      
      // Combine chunks into single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const buffer = new Uint8Array(totalLength)
      let offset = 0
      
      for (const chunk of chunks) {
        buffer.set(chunk, offset)
        offset += chunk.length
      }
      
      // Convert to base64 data URL
      const base64 = Buffer.from(buffer).toString('base64')
      imageUrl = `data:image/png;base64,${base64}`
      
      console.log('[Remove Background API] Converted to data URL, length:', imageUrl.length)
      
    } else if (typeof output === 'string') {
      imageUrl = output
      console.log('[Remove Background API] Output is string:', imageUrl)
    } else if (Array.isArray(output) && output.length > 0) {
      // Check if array contains Uint8Array (processed by ServerReplicateClient)
      if (output[0] instanceof Uint8Array) {
        console.log('[Remove Background API] Array contains Uint8Array, converting to data URL...')
        const base64 = Buffer.from(output[0]).toString('base64')
        imageUrl = `data:image/png;base64,${base64}`
      } else {
        imageUrl = output[0]
        console.log('[Remove Background API] Output is array, using first element:', imageUrl)
      }
    } else {
      console.error('[Remove Background API] Unexpected output format:', typeof output, output)
      return NextResponse.json(
        { error: 'Unexpected output format from background removal', debug: { type: typeof output, constructor: output?.constructor?.name } },
        { status: 500 }
      )
    }
    
    console.log('[Remove Background API] Final imageUrl type:', typeof imageUrl)
    console.log('[Remove Background API] Final imageUrl length:', imageUrl?.length)
    
    // Validate that we have a valid URL or data URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('[Remove Background API] Invalid imageUrl:', typeof imageUrl)
      return NextResponse.json(
        { error: 'Failed to extract image URL from response' },
        { status: 500 }
      )
    }
    
    console.log('[Remove Background API] ===== BACKGROUND REMOVAL COMPLETED SUCCESSFULLY =====')
    
    // Return success response
    return NextResponse.json({
      success: true,
      imageUrl,
      originalImageUrl: params.image,
      metadata: {
        model: REMOVE_BACKGROUND_MODEL_ID,
        processingTime,
        parameters: {
          // No additional parameters for this model
        }
      }
    })
    
  } catch (error) {
    console.error('[Remove Background API] ===== ERROR OCCURRED =====')
    console.error('[Remove Background API] Error:', error)
    console.error('[Remove Background API] Error type:', typeof error)
    console.error('[Remove Background API] Error constructor:', error?.constructor?.name)
    
    if (error instanceof Error) {
      console.error('[Remove Background API] Error message:', error.message)
      console.error('[Remove Background API] Error stack:', error.stack)
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('[Remove Background API] Zod validation error:', error.errors)
      return NextResponse.json(
        { 
          error: 'Invalid parameters', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    // Handle specific Replicate errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      console.error('[Remove Background API] Processing error message:', errorMessage)
      
      if (errorMessage.includes('cannot identify image file')) {
        console.error('[Remove Background API] Image identification error - possible causes:')
        console.error('[Remove Background API] 1. Corrupted image data')
        console.error('[Remove Background API] 2. Unsupported image format')
        console.error('[Remove Background API] 3. Invalid base64 encoding')
        console.error('[Remove Background API] 4. Model-specific format requirements')
        
        return NextResponse.json(
          { 
            error: 'The AI model could not identify the image format. This could be due to corrupted image data, unsupported format, or encoding issues.',
            details: 'Please try re-uploading the image, converting to PNG format, or using a different image.',
            debugInfo: {
              originalError: error.message,
              suggestion: 'Try saving the image as PNG and re-uploading'
            }
          },
          { status: 400 }
        )
      }
      
      if (errorMessage.includes('image too large')) {
        return NextResponse.json(
          { 
            error: 'Image is too large. Please use a smaller image.',
            details: 'Maximum image size exceeded.'
          },
          { status: 400 }
        )
      }
      
      if (errorMessage.includes('replicate_api_key')) {
        return NextResponse.json(
          { error: 'Replicate API not configured on server' },
          { status: 503 }
        )
      }
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        error: 'Background removal failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        debugInfo: {
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to remove backgrounds.' },
    { status: 405 }
  )
} 