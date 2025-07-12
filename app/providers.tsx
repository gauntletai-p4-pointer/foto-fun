'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect, useState } from 'react'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import { AppInitializer, ServiceContainerProvider } from '@/lib/core/AppInitializer'

export function Providers({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<ServiceContainer | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    console.log('[Providers] Starting app initialization...')
    
    // Initialize the service container
    AppInitializer.initialize()
      .then((serviceContainer) => {
        console.log('[Providers] App initialized successfully')
        setContainer(serviceContainer)
        setIsInitialized(true)
      })
      .catch((error) => {
        console.error('[Providers] Failed to initialize app:', error)
        setError(error)
      })
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-error mb-2">Initialization Error</h1>
          <p className="text-foreground/60 mb-4">Failed to initialize the application</p>
          <pre className="text-left bg-foreground/5 p-4 rounded-md text-sm overflow-auto max-w-2xl">
            {error.message}
          </pre>
        </div>
      </div>
    )
  }

  if (!isInitialized || !container) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground/20 mx-auto mb-4"></div>
          <p className="text-foreground/60">Initializing application...</p>
        </div>
      </div>
    )
  }

  return (
    <ServiceContainerProvider value={container}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </ServiceContainerProvider>
  )
} 