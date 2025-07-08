'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { signInWithOAuth } from '@/lib/auth/actions'

export function HeroSection() {
  const [commandText, setCommandText] = useState('')
  
  useEffect(() => {
    const commands = [
      'Make the sunset more vibrant',
      'Remove the background',
      'Add dramatic lighting',
      'Make it look cinematic',
      'Enhance for social media'
    ]
    
    let commandIndex = 0
    let charIndex = 0
    let isDeleting = false
    
    const typeEffect = () => {
      const currentCommand = commands[commandIndex]
      
      if (!isDeleting && charIndex < currentCommand.length) {
        setCommandText(currentCommand.substring(0, charIndex + 1))
        charIndex++
      } else if (isDeleting && charIndex > 0) {
        setCommandText(currentCommand.substring(0, charIndex - 1))
        charIndex--
      } else if (!isDeleting && charIndex === currentCommand.length) {
        setTimeout(() => {
          isDeleting = true
        }, 2000)
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false
        commandIndex = (commandIndex + 1) % commands.length
      }
    }
    
    const interval = setInterval(typeEffect, isDeleting ? 50 : 100)
    return () => clearInterval(interval)
  }, [])

  const handleGetStarted = async () => {
    // Sign in with Google OAuth
    await signInWithOAuth('google')
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-accent/30 to-primary/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-full blur-3xl animate-pulse delay-500" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">AI-Powered Editing</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  AI-Native Photo Editing
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
                  in Your Browser
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-foreground/60 mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
                Professional photo editing powered by AI. Edit with natural language, 
                get instant results, no installation required.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
                <form action={handleGetStarted}>
                  <Button 
                    type="submit"
                    size="lg" 
                    className="group relative overflow-hidden bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Start Creating Free
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Button>
                </form>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 hover:bg-foreground/10/50 backdrop-blur-sm"
                  asChild
                >
                  <Link href="#demo">
                    Watch Demo
                    <Sparkles className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6 mt-8 text-sm text-foreground/60 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-3 duration-500 delay-400">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>No Installation Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>GPU Accelerated</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">10,000+</span>
                  <span>Active Users</span>
                </div>
              </div>
            </div>

            {/* Visual */}
            <div className="relative animate-in fade-in zoom-in-95 duration-700 delay-200">
              {/* Editor preview */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl bg-background border">
                {/* Browser chrome */}
                <div className="bg-foreground/5/50 px-4 py-3 flex items-center gap-2 border-b">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-background/50 rounded-md px-3 py-1 text-xs text-foreground/60">
                      fotofun.app/editor
                    </div>
                  </div>
                </div>

                {/* Editor content */}
                <div className="relative h-96 bg-gradient-to-br from-secondary/20 to-secondary/5">
                  {/* Command input */}
                  <div className="absolute top-4 left-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg border p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                      <div className="flex-1">
                        <p className="text-sm text-foreground/60 mb-1">AI Command</p>
                        <p className="font-medium">
                          {commandText}
                          <span className="inline-block w-0.5 h-5 bg-primary animate-pulse ml-1" />
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Image preview placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-32 mx-auto mb-4 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
                      <p className="text-sm text-foreground/60">Live preview updates in real-time</p>
                    </div>
                  </div>

                  {/* Performance indicator */}
                  <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-md px-3 py-2 text-xs">
                    <span className="text-green-500 font-medium">Processed in 0.3s</span>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-primary to-accent text-white rounded-lg px-3 py-1.5 text-sm font-medium shadow-lg animate-bounce">
                AI Powered
              </div>
              <div className="absolute -bottom-4 -left-4 bg-background border rounded-lg px-3 py-1.5 text-sm shadow-lg animate-in fade-in slide-in-from-left-3 duration-500 delay-500">
                <span className="text-foreground/60">Try:</span> <span className="font-medium">&quot;Make it pop&quot;</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-foreground/30 flex items-start justify-center p-1">
          <div className="w-1 h-2 bg-foreground/30 rounded-full animate-scroll" />
        </div>
      </div>
    </section>
  )
} 