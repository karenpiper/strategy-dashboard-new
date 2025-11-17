export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse"></div>
        <div className="w-16 h-16 rounded-full border-4 border-accent border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="ml-4 text-lg font-bold text-foreground">Loading resources...</p>
    </div>
  )
}
