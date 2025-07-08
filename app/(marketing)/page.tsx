import { HeroSection } from '@/components/marketing/hero-section'
import { FeaturesSection } from '@/components/marketing/features-section'
import { DemoSection } from '@/components/marketing/demo-section'
import { TestimonialsSection } from '@/components/marketing/testimonials-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { FAQSection } from '@/components/marketing/faq-section'

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
    </>
  )
} 