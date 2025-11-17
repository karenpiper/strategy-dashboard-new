export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#E8FF00] border-t-transparent" />
        <p className="font-sans text-lg text-white">Loading dashboard...</p>
      </div>
    </div>
  )
}
