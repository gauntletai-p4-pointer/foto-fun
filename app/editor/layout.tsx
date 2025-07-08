export default function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col bg-background dark:bg-background overflow-hidden">
      {children}
    </div>
  )
} 