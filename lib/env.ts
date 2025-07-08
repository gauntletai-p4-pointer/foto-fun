import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  
  // Site URL for OAuth redirects
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  
  // Deployment mode
  NEXT_PUBLIC_DEPLOYMENT: z.enum(['cloud', 'self-hosted']).default('self-hosted'),
  
  // Feature flags - all optional for self-hosted
  NEXT_PUBLIC_ENABLE_REALTIME: z.string().optional(),
  NEXT_PUBLIC_AI_SERVICE_URL: z.string().url().optional(),
  NEXT_PUBLIC_AI_SERVICE_KEY: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
  
  // AI Services - optional for self-hosted
  OPENAI_API_KEY: z.string().optional(),
  
  // Optional: Add other env vars as needed
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const envData = {
  DATABASE_URL: process.env.DATABASE_URL!,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_DEPLOYMENT: process.env.NEXT_PUBLIC_DEPLOYMENT as 'cloud' | 'self-hosted' | undefined,
  NEXT_PUBLIC_ENABLE_REALTIME: process.env.NEXT_PUBLIC_ENABLE_REALTIME,
  NEXT_PUBLIC_AI_SERVICE_URL: process.env.NEXT_PUBLIC_AI_SERVICE_URL,
  NEXT_PUBLIC_AI_SERVICE_KEY: process.env.NEXT_PUBLIC_AI_SERVICE_KEY,
  NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined,
}

export const env = envSchema.parse(envData) 