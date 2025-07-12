'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { signInWithOAuth } from '@/lib/auth/actions'

const sampleCommands = [
  'Make it more professional',
  'Add dramatic lighting',
  'Remove the background',
  'Enhance for social media',
  'Fix the exposure'
]

export function DemoSection() {
  const [selectedCommand, setSelectedCommand] = useState(0)
  const { user, loading } = useAuth()

  const handleLaunchEditor = async () => {
    if (!user) {
      await signInWithOAuth('google')
    }
  }

  return (
    <section className="py-24 bg-foreground/5/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary/10/5 rounded-full blur-3xl -translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Live Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            See the{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Magic in Action
            </span>
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Try FotoFun right now - no signup required. Click a command below to see instant AI-powered editing.
          </p>
        </div>

        {/* Demo Interface */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-background rounded-2xl border shadow-xl overflow-hidden">
            {/* Command Bar */}
            <div className="border-b p-6">
              <h3 className="text-sm font-medium text-foreground/60 mb-4">Try these AI commands:</h3>
              <div className="flex flex-wrap gap-2">
                {sampleCommands.map((command, index) => (
                  <Button
                    key={command}
                    variant={selectedCommand === index ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCommand(index)}
                    className="transition-all"
                  >
                    {command}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preview Area */}
            <div className="relative h-96 bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
              <div className="text-center">
                <div className="w-48 h-48 mx-auto mb-6 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse flex items-center justify-center">
                  <Sparkles className="h-12 w-12 text-primary/50" />
                </div>
                <p className="text-foreground/60 mb-4">
                  Selected command: <span className="font-medium text-foreground">{sampleCommands[selectedCommand]}</span>
                </p>
                {loading ? (
                  <div className="h-10 w-40 bg-foreground/10 rounded-md animate-pulse" />
                ) : user ? (
                  <Button className="group" asChild>
                    <Link href="/editor">
                      <span>Launch Full Editor</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                ) : (
                  <form action={handleLaunchEditor}>
                    <Button className="group" type="submit">
                      <span>Launch Full Editor</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </form>
                )}
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 bg-success/10 text-success rounded-md px-3 py-1 text-sm">
                AI Ready
              </div>
            </div>
          </div>

          {/* Features below demo */}
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">0.3s</div>
              <p className="text-sm text-foreground/60">Average processing time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">100+</div>
              <p className="text-sm text-foreground/60">AI commands available</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">∞</div>
              <p className="text-sm text-foreground/60">Creative possibilities</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 