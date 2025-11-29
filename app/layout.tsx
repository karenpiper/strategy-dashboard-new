import type { Metadata } from 'next'
import { Raleway } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ModeProvider } from '@/contexts/mode-context'
import { AuthProvider } from '@/contexts/auth-context'
import { PermissionsProvider } from '@/contexts/permissions-context'
import { ThemeProvider } from '@/components/theme-provider'
import { AnalyticsProvider } from '@/components/analytics-provider'
import './globals.css'

const raleway = Raleway({ 
  subsets: ["latin"],
  variable: '--font-raleway',
  weight: ['400', '500', '600', '700'], // Reduced from 9 weights to 4 most common
  display: 'swap', // Improve font loading performance
});

export const metadata: Metadata = {
  title: 'Strategy Dashboard | It Went Well',
  description: 'Team dashboard for strategy, projects, and collaboration',
  keywords: ['strategy', 'dashboard', 'team', 'collaboration', 'projects'],
  authors: [{ name: 'Code and Theory' }],
  creator: 'Code and Theory',
  publisher: 'Code and Theory',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://itwentwell.com'),
  openGraph: {
    title: 'Strategy Dashboard | It Went Well',
    description: 'Team dashboard for strategy, projects, and collaboration',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://itwentwell.com',
    siteName: 'It Went Well',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/icon.svg',
        width: 1200,
        height: 630,
        alt: 'It Went Well Strategy Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Strategy Dashboard | It Went Well',
    description: 'Team dashboard for strategy, projects, and collaboration',
    images: ['/icon.svg'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${raleway.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <PermissionsProvider>
              <ModeProvider>
                <AnalyticsProvider>
                  {children}
                </AnalyticsProvider>
              </ModeProvider>
            </PermissionsProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
