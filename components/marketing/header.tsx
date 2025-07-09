'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Menu, X, Github, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { signInWithOAuth } from '@/lib/auth/actions'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Features', href: '#features' },
  { name: 'Demo', href: '#demo' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'FAQ', href: '#faq' },
]

export function Header() {
  const { theme, setTheme } = useTheme()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [githubStars] = useState<number | null>(null)
  const { user, loading } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Temporarily disable GitHub stars fetch
  // useEffect(() => {
  //   fetch('https://api.github.com/repos/fotofun/fotofun')
  //     .then(res => res.json())
  //     .then(data => setGithubStars(data.stargazers_count))
  //     .catch(() => setGithubStars(null))
  // }, [])

  const handleSignIn = async () => {
    await signInWithOAuth('google')
  }

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled ? "bg-background/80 backdrop-blur-lg border-b" : "bg-transparent"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="font-bold text-xl">FotoFun</span>
          </Link>

          {/* Desktop Navigation and Actions */}
          <div className="hidden md:flex items-center gap-6">
            {/* Navigation */}
            <nav className="flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Icons */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              
              {/* GitHub Link with Stars */}
              <Button variant="ghost" size="icon" asChild>
                <Link
                  href="https://github.com/fotofun/fotofun"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  {githubStars && (
                    <span className="bg-foreground/5 px-2 py-0.5 rounded-full text-xs">
                      {githubStars}
                    </span>
                  )}
                </Link>
              </Button>
            </div>

            {/* CTA Button */}
            <div className="ml-2">
              {loading ? (
                <div className="h-9 w-24 bg-foreground/10 rounded-md animate-pulse" />
              ) : user ? (
                <Button asChild>
                  <Link href="/editor">
                    Open Editor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <form action={handleSignIn}>
                  <Button type="submit">
                    Sign in
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-t">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block py-2 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              
              <Link
                href="https://github.com/fotofun/fotofun"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Github className="h-4 w-4" />
                GitHub
                {githubStars && (
                  <span className="bg-foreground/5 px-2 py-0.5 rounded-full text-xs">
                    {githubStars}
                  </span>
                )}
              </Link>
              {loading ? (
                <div className="h-10 w-full bg-foreground/10 rounded-md animate-pulse" />
              ) : user ? (
                <Link href="/editor" className="block pt-2">
                  <Button className="w-full bg-gradient-to-r from-primary to-primary-dark">
                    Open Editor
                  </Button>
                </Link>
              ) : (
                <form action={handleSignIn}>
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-primary-dark">
                    Sign in
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
} 