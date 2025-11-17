export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-[#C4F500] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-white font-bold text-center">Loading...</p>
      </div>
    </div>
  )
}
