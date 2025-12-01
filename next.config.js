/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase timeout for API routes (especially for audio transcription)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig

