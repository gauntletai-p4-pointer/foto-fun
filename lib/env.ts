import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  
  // Site URL for OAuth redirects
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  
  // Optional: Add other env vars as needed
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const envData = {
  DATABASE_URL: process.env.DATABASE_URL!,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined,
}

export const env = envSchema.parse(envData) 