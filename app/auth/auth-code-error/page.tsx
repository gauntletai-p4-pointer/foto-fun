import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-semibold">Authentication Error</h1>
          <p className="text-foreground/60">
            There was an error signing you in. Please try again.
          </p>
        </div>
        
        <div className="space-y-2">
          <Link href="/" className="block">
            <Button className="w-full">
              Return to Home
            </Button>
          </Link>
          
          <p className="text-sm text-foreground/60">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
} 