'use client'

import Link from 'next/link'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { AccountMenu } from '@/components/account-menu'
import { OnlineUsers } from '@/components/online-users'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface SiteHeaderProps {
  rightContent?: ReactNode
}

export function SiteHeader({ rightContent }: SiteHeaderProps = {}) {
  const { mode } = useMode()
  const { user } = useAuth()
  const pathname = usePathname()

  const getBgClass = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#1A1A1A]'
      case 'chill': return 'bg-[#F5E6D3]'
      case 'code': return 'bg-black'
      default: return 'bg-[#1A1A1A]'
    }
  }

  const getBorderClass = () => {
    switch (mode) {
      case 'chaos': return 'border-[#333333]'
      case 'chill': return 'border-[#4A1818]/20'
      case 'code': return 'border-[#FFFFFF]'
      default: return 'border-[#333333]'
    }
  }

  const getNavLinkClass = (isActive = false) => {
    const base = `transition-colors text-sm font-black uppercase ${mode === 'code' ? 'font-mono' : ''}`
    if (isActive) {
      switch (mode) {
        case 'chaos': return `${base} text-white hover:text-[#C4F500]`
        case 'chill': return `${base} text-[#4A1818] hover:text-[#FFC043]`
        case 'code': return `${base} text-[#FFFFFF] hover:text-[#FFFFFF]`
        default: return `${base} text-white hover:text-[#C4F500]`
      }
    } else {
      switch (mode) {
        case 'chaos': return `${base} text-[#666666] hover:text-white`
        case 'chill': return `${base} text-[#8B4444] hover:text-[#4A1818]`
        case 'code': return `${base} text-[#808080] hover:text-[#FFFFFF]`
        default: return `${base} text-[#666666] hover:text-white`
      }
    }
  }

  const getLogoBg = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#C4F500]'
      case 'chill': return 'bg-[#FFC043]'
      case 'code': return 'bg-[#FFFFFF]'
      default: return 'bg-[#C4F500]'
    }
  }

  const getLogoText = () => {
    switch (mode) {
      case 'chaos': return 'text-black'
      case 'chill': return 'text-[#4A1818]'
      case 'code': return 'text-black'
      default: return 'text-black'
    }
  }

  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(path)
  }

  return (
    <header className={`border-b ${getBorderClass()} px-6 py-4 fixed top-0 left-0 right-0 z-50 ${getBgClass()}`}>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''} cursor-pointer`}>
            {mode === 'code' ? 'C:\\>' : 'D'}
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className={getNavLinkClass(isActive('/'))}>HOME</Link>
            <Link href="/work-samples" className={getNavLinkClass(isActive('/work-samples'))}>WORK</Link>
            <Link href="/resources" className={getNavLinkClass(isActive('/resources'))}>RESOURCES</Link>
            <Link href="/media" className={getNavLinkClass(isActive('/media'))}>MEDIA</Link>
            <Link href="/team" className={getNavLinkClass(isActive('/team'))}>TEAM</Link>
            <Link href="/snaps" className={getNavLinkClass(isActive('/snaps'))}>SNAPS</Link>
            <Link href="/vibes" className={getNavLinkClass(isActive('/vibes'))}>VIBES</Link>
            <Link href="/playground" className={getNavLinkClass(isActive('/playground'))}>PLAYGROUND</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user && <OnlineUsers maxDisplay={5} showCount={true} size="sm" />}
          {rightContent}
          {user && <AccountMenu />}
        </div>
      </div>
    </header>
  )
}

