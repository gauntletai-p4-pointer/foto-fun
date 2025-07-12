// STUB: ImageGenerationAdapter disabled during refactor
export class ImageGenerationAdapter {
  async execute(params: any, context: any): Promise<{ objectId?: string }> {
    console.warn('ImageGenerationAdapter disabled during refactor');
    throw new Error('AI image generation is temporarily disabled during refactor');
  }
} 