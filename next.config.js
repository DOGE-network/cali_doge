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