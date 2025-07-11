/**
 * Deployment Configuration
 * Simple detection for cloud vs self-hosted environments
 */

/**
 * Deployment type
 */
export type DeploymentType = 'cloud' | 'self-hosted'

/**
 * Get current deployment type
 */
export function getDeploymentType(): DeploymentType {
  // Check for cloud-specific environment variables
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') ||
    process.env.VERCEL_ENV ||
    process.env.RAILWAY_ENVIRONMENT
  ) {
    return 'cloud'
  }
  
  return 'self-hosted'
}

/**
 * Check if running in cloud
 */
export function isCloud(): boolean {
  return getDeploymentType() === 'cloud'
}

/**
 * Check if self-hosted
 */
export function isSelfHosted(): boolean {
  return getDeploymentType() === 'self-hosted'
}

/**
 * Get API key based on deployment
 */
export function getReplicateApiKey(): string | undefined {
  if (isCloud()) {
    // Cloud version uses server-side key
    return process.env.REPLICATE_API_KEY
  } else {
    // Self-hosted uses client-side key (user provides their own)
    return process.env.NEXT_PUBLIC_REPLICATE_API_KEY
  }
} 