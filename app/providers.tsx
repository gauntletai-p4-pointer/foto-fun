'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect, useState } from 'react'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import { AppInitializer, ServiceContainerProvider } from '@/lib/core/AppInitializer'

export function Providers({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<ServiceContainer | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize the service container
    AppInitializer.initialize()
      .then((serviceContainer) => {
        setContainer(serviceContainer)
        setIsInitialized(true)
      })
      .catch((error) => {
        console.error('Failed to initialize app:', error)
      })
  }, [])

  if (!isInitialized) {
    // Show loading state while initializing
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1e1e] text-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Initializing application...</p>
        </div>
      </div>
    )
  }

  return (
    <ServiceContainerProvider value={container}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </ServiceContainerProvider>
  )
} 