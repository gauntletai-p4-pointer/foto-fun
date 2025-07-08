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
          
          <h1 className="text-3xl font-bold">Authentication Error</h1>
          
          <p className="text-muted-foreground">
            There was an error during the authentication process. This could be due to an expired link or a network issue.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">
              Return to Home
            </Link>
          </Button>
          
          <p className="text-sm text-muted-foreground">
            If this problem persists, please contact support or try again later.
          </p>
        </div>
      </div>
    </div>
  )
} 