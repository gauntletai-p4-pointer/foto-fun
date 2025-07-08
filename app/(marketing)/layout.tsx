import { Metadata } from 'next'
import { Header } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'

export const metadata: Metadata = {
  title: {
    default: 'FotoFun - AI-Native Photo Editing in Your Browser',
    template: '%s | FotoFun'
  },
  description: 'Professional photo editing powered by AI. Edit with natural language, get instant results, no installation required.',
  keywords: ['ai photo editor', 'browser photo editor', 'online photoshop alternative', 'natural language editing'],
  authors: [{ name: 'FotoFun Team' }],
  creator: 'FotoFun',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fotofun.app',
    siteName: 'FotoFun',
    title: 'FotoFun - AI-Native Photo Editing in Your Browser',
    description: 'Professional photo editing powered by AI. Edit with natural language, get instant results, no installation required.',
    images: [
      {
        url: 'https://fotofun.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FotoFun - AI Photo Editor'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FotoFun - AI-Native Photo Editing',
    description: 'Professional photo editing powered by AI, right in your browser.',
    creator: '@fotofun',
    images: ['https://fotofun.app/twitter-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  }
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  )
} 