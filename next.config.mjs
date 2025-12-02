/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/**',
      },
      {
        protocol: 'https',
        hostname: '**.airtable.com',
      },
      {
        protocol: 'https',
        hostname: '**.airtableusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.spotifycdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.spotify.com',
      },
      {
        protocol: 'https',
        hostname: 'mosaic.scdn.co',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
      {
        protocol: 'https',
        hostname: '**.oaidalleapiprodscus.blob.core.windows.net',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Increase body size limit for API routes (especially file uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Enable compression
  compress: true,
}

export default nextConfig
