'use client'

import { Star, Quote } from 'lucide-react'
import Image from 'next/image'

const testimonials = [
  {
    quote: "FotoFun's AI understands exactly what I want. It's like having a professional editor who reads my mind.",
    author: "Sarah Chen",
    role: "Content Creator",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    rating: 5
  },
  {
    quote: "The browser-based approach means I can edit from anywhere. The AI suggestions have transformed my workflow.",
    author: "Marcus Rodriguez", 
    role: "Professional Photographer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    rating: 5
  },
  {
    quote: "Finally, professional editing tools that don't require a PhD to use. The AI assistance is a game-changer.",
    author: "Emma Thompson",
    role: "Small Business Owner",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    rating: 5
  }
]

const metrics = [
  { value: '10,000+', label: 'Active Users' },
  { value: '500+', label: 'GitHub Stars' },
  { value: '2M+', label: 'Photos Edited' },
  { value: '4.9/5', label: 'User Rating' }
]

export function TestimonialsSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-l from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-r from-accent/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-sm font-medium">Social Proof</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Loved by{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Creators Worldwide
            </span>
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Join thousands of creators who are already transforming their workflow with FotoFun&apos;s AI-powered editing.
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-16">
          {metrics.map((metric, index) => (
            <div 
              key={metric.label} 
              className="text-center"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                {metric.value}
              </div>
              <p className="text-sm text-foreground/60">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.author}
              className="group relative"
              style={{
                animationDelay: `${index * 150}ms`
              }}
            >
              <div className="relative h-full bg-background rounded-2xl border p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {/* Quote icon */}
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-foreground/60 mb-6 relative z-10">
                  &quot;{testimonial.quote}&quot;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.author}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-foreground/60">{testimonial.role}</p>
                  </div>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          ))}
        </div>

        {/* Use Cases */}
        <div className="mt-16 text-center">
          <p className="text-sm text-foreground/60 mb-4">Perfect for</p>
          <div className="flex flex-wrap justify-center gap-4">
            {['Portrait Photography', 'Product Shots', 'Social Media', 'E-commerce', 'Real Estate'].map((useCase) => (
              <div
                key={useCase}
                className="px-4 py-2 rounded-full bg-foreground/5 text-sm font-medium"
              >
                {useCase}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
} 