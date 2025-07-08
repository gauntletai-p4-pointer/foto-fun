'use client'

import { Check, Sparkles, Zap, Users, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { signInWithOAuth } from '@/lib/auth/actions'

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started',
    icon: Sparkles,
    features: [
      '10 AI edits per month',
      'Basic editing tools',
      '720p export resolution',
      'Community support',
      '1GB storage'
    ],
    cta: 'Start Free',
    href: '/editor',
    popular: false
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'For serious creators',
    icon: Zap,
    features: [
      'Unlimited AI edits',
      'All professional tools',
      '4K+ export resolution',
      'Priority support',
      '100GB storage',
      'Batch processing',
      'Custom presets'
    ],
    cta: 'Start Free Trial',
    note: '14-day free trial',
    href: '/auth/signin?plan=pro',
    popular: true
  },
  {
    name: 'Team',
    price: '$29',
    period: '/month',
    description: 'Collaborate and scale',
    icon: Users,
    features: [
      'Everything in Pro',
      '5 team members',
      'Shared workspaces',
      'Brand kit',
      'API access',
      '1TB storage',
      'Admin controls'
    ],
    cta: 'Start Team Trial',
    href: '/auth/signin?plan=team',
    popular: false
  },
  {
    name: 'Self-Hosted',
    price: 'Free',
    description: 'For developers',
    icon: Code,
    features: [
      'Full source code',
      'Unlimited usage',
      'Self-host anywhere',
      'Community support'
    ],
    cta: 'View on GitHub',
    href: 'https://github.com/fotofun/fotofun',
    external: true,
    popular: false
  }
]

export function PricingSection() {
  const handleStartFree = async () => {
    // Sign in with Google OAuth
    await signInWithOAuth('google')
  }

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Pricing Plans</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Simple,{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Transparent Pricing
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative group ${plan.popular ? 'md:-mt-4' : ''}`}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <div className="bg-gradient-to-r from-primary to-accent text-white text-sm font-medium px-4 py-1 rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                </div>
              )}

              <div className={`relative h-full bg-background rounded-2xl border ${plan.popular ? 'border-primary shadow-xl' : ''} p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
                {/* Plan icon */}
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 flex items-center justify-center">
                    <plan.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>

                {/* Plan details */}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                
                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-auto">
                  {plan.name === 'Pro' ? (
                    <form action={handleStartFree}>
                      <Button 
                        type="submit"
                        className={`w-full ${plan.popular ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/25' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {plan.cta}
                      </Button>
                    </form>
                  ) : (
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/25' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                      asChild
                    >
                      <Link href={plan.href} target={plan.external ? '_blank' : undefined}>
                        {plan.cta}
                      </Link>
                    </Button>
                  )}
                  {plan.note && (
                    <p className="text-xs text-center text-muted-foreground mt-2">{plan.note}</p>
                  )}
                </div>

                {/* Hover gradient */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            All plans include access to our AI-powered editing tools
          </p>
          <p className="text-sm text-muted-foreground">
            Questions? <Link href="/contact" className="text-primary hover:underline">Contact our team</Link>
          </p>
        </div>
      </div>
    </section>
  )
} 