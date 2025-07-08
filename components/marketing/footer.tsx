import Link from 'next/link'
import { Github, Twitter, Linkedin, Sparkles } from 'lucide-react'

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Changelog', href: '/changelog' },
    { label: 'Roadmap', href: '/roadmap' },
  ],
  resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'Blog', href: '/blog' },
    { label: 'Tutorials', href: '/tutorials' },
    { label: 'API Docs', href: '/api' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press', href: '/press' },
    { label: 'Contact', href: '/contact' },
  ],
  connect: [
    { label: 'GitHub', href: 'https://github.com/fotofun/fotofun', icon: Github },
    { label: 'Discord', href: 'https://discord.gg/fotofun', icon: null },
    { label: 'Twitter', href: 'https://twitter.com/fotofun', icon: Twitter },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/fotofun', icon: Linkedin },
  ],
}

export function MarketingFooter() {
  return (
    <footer className="relative bg-background border-t mt-32">
      {/* Gradient decoration */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo and Tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent blur-lg opacity-50" />
                <Sparkles className="relative h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold">FotoFun</span>
            </Link>
            <p className="text-sm text-foreground/60">
              AI-Native Photo Editing
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Links */}
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <ul className="space-y-2">
              {footerLinks.connect.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    {link.icon && <link.icon className="h-4 w-4" />}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-foreground/60 text-center md:text-left">
              © 2024 FotoFun. Made with ❤️ by creators, for creators.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="text-sm text-foreground/60 hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-foreground/60 hover:text-foreground transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/security"
                className="text-sm text-foreground/60 hover:text-foreground transition-colors"
              >
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 