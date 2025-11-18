'use client'

import { useMode } from '@/contexts/mode-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Music, Sparkles, Cloud, FileText, BarChart3, Home } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { mode } = useMode()
  const pathname = usePathname()

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/playlists', label: 'Playlists', icon: Music },
    { href: '/admin/horoscopes', label: 'Horoscopes', icon: Sparkles },
    { href: '/admin/weather', label: 'Weather', icon: Cloud },
    { href: '/admin/content', label: 'Content Cards', icon: FileText },
    { href: '/admin/stats', label: 'Stats & Metrics', icon: BarChart3 },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-border bg-card p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Admin CMS</h1>
          <p className="text-sm text-muted-foreground mt-1">Content Management</p>
        </div>
        
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 pt-8 border-t border-border">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  )
}

