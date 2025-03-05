/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'abs.twimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cali-doge.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'doge.gov',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
    ],
  },
  // Ensure media files are handled properly
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: '/src/data/media/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 