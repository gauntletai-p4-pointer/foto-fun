'use client'

import { Brain, Palette, Globe, Workflow, Sparkles, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { signInWithOAuth } from '@/lib/auth/actions'

const features = [
  {
    icon: Brain,
    title: 'AI That Understands You',
    description: 'Just describe what you want. Our AI understands commands like "make it brighter", "remove the background", or "make it look cinematic".',
    highlights: [
      'Context-aware suggestions',
      'Multi-step workflows', 
      'Real-time preview'
    ],
    gradient: 'from-blue-500 to-purple-500'
  },
  {
    icon: Palette,
    title: '30+ Professional Tools',
    description: 'Complete editing toolkit including selections, transforms, filters, and layers. GPU-accelerated for smooth performance even with large images.',
    highlights: [
      'Non-destructive editing',
      'Keyboard shortcuts',
      'Familiar interface'
    ],
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Globe,
    title: 'No Installation Required',
    description: 'Full-featured editor that runs entirely in your browser. Access your projects from anywhere, on any device, with automatic saving.',
    highlights: [
      'Works offline',
      'Cross-platform',
      'Instant loading'
    ],
    gradient: 'from-green-500 to-teal-500'
  },
  {
    icon: Workflow,
    title: 'AI-Powered Workflows',
    description: 'The AI learns your editing style and automates repetitive tasks. Create custom workflows, batch process images, and save hours.',
    highlights: [
      'Pattern recognition',
      'One-click presets',
      'Batch processing'
    ],
    gradient: 'from-orange-500 to-red-500'
  }
]

export function FeaturesSection() {
  const { user, loading } = useAuth()

  const handleTryNow = async () => {
    if (!user) {
      await signInWithOAuth('google')
    }
  }

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Powerful Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Edit Like a Pro
            </span>
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Professional tools enhanced by AI, accessible from anywhere, with the power to transform your creative workflow.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Card */}
              <div className="relative h-full bg-background rounded-2xl border p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                {/* Icon */}
                <div className="relative mb-6">
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} blur-2xl opacity-20 group-hover:opacity-30 transition-opacity`} />
                  <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} p-0.5`}>
                    <div className="w-full h-full bg-background rounded-[11px] flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-foreground" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-foreground/60 mb-6">{feature.description}</p>

                {/* Highlights */}
                <ul className="space-y-2">
                  {feature.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-2 text-sm">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${feature.gradient}`} />
                      <span className="text-foreground/60">{highlight}</span>
                    </li>
                  ))}
                </ul>

                {/* Decorative elements */}
                <div className="absolute top-4 right-4 opacity-10">
                  <feature.icon className="h-24 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-foreground/60 mb-4">Ready to experience the future of photo editing?</p>
          {loading ? (
            <div className="inline-block h-6 w-24 bg-foreground/10 rounded animate-pulse" />
          ) : user ? (
            <a
              href="/editor"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Try it now
              <Zap className="h-4 w-4" />
            </a>
          ) : (
            <form action={handleTryNow} className="inline">
              <button
                type="submit"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Try it now
                <Zap className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
} 