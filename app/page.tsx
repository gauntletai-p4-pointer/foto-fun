import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">FotoFun</h1>
        <p className="text-muted-foreground mb-8">Professional photo editing in your browser</p>
        <Link 
          href="/editor"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Open Editor
        </Link>
      </div>
    </div>
  );
}
