'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: 'How does the AI editing work?',
    answer: 'Our AI uses advanced natural language processing to understand your commands and translate them into professional editing operations. Simply type what you want to achieve, and the AI will apply the appropriate adjustments, filters, and effects in real-time.'
  },
  {
    question: 'Do I need to install anything?',
    answer: 'No installation required! FotoFun runs entirely in your browser using WebAssembly and WebGL technology. Just open the website and start editing. You can even save it as a PWA for an app-like experience.'
  },
  {
    question: 'Can I use it offline?',
    answer: 'Yes! Core editing features work offline once the app is loaded. AI features require an internet connection for natural language processing, but your edits are saved locally and will sync when you&apos;re back online.'
  },
  {
    question: 'What file formats are supported?',
    answer: 'We support all major image formats including JPEG, PNG, WebP, HEIC, and even RAW files from popular cameras. Export is available in JPEG, PNG, and WebP formats with customizable quality settings.'
  },
  {
    question: 'How does it compare to desktop software?',
    answer: 'FotoFun offers similar features to traditional desktop editors like Photoshop and Lightroom, but with the added benefit of AI assistance and browser-based convenience. Our GPU-accelerated engine ensures smooth performance even with large images.'
  },
  {
    question: 'Is there an API for developers?',
    answer: 'Yes! Team and Enterprise plans include REST API access for automation and integration. You can programmatically edit images, apply presets, and integrate FotoFun into your existing workflows. Full documentation is available for developers.'
  }
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-24 bg-foreground/5/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-t from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">FAQs</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Everything you need to know about FotoFun. Can&apos;t find what you&apos;re looking for? Feel free to contact our support team.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="group"
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left bg-background rounded-xl border p-6 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold pr-8">{faq.question}</h3>
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-foreground/60 shrink-0 transition-transform duration-300",
                      openIndex === index && "rotate-180"
                    )}
                  />
                </div>
                
                {/* Answer */}
                <div
                  className={cn(
                    "grid transition-all duration-300",
                    openIndex === index ? "grid-rows-[1fr] mt-4" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="text-foreground/60">{faq.answer}</p>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-foreground/60 mb-4">Still have questions?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/docs"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border hover:bg-foreground/5 transition-colors"
            >
              Read Documentation
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </section>
  )
} 