/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable font optimization to prevent Google Fonts requests
  optimizeFonts: false,
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    unoptimized: true,
  },
  
  // Optional: Add other offline-friendly settings
  experimental: {
    // Disable telemetry for offline use
    telemetry: false,
  },
}

export default nextConfig
