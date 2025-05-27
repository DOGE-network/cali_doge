/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        // Add any specific rules if needed
        // Example: "*.mdx": ["mdx-loader"]
      }
    },
    // Configure file tracing for serverless functions - include only specific files each API needs
    outputFileTracingIncludes: {
      '/api/departments': ['./src/data/departments.json'],
      '/api/spend': [
        './src/data/budgets.json',
        './src/data/vendors.json', 
        './src/data/programs.json',
        './src/data/funds.json',
        './src/data/departments.json'
      ],
      '/api/vendors/top': [
        './src/data/vendors.json',
        './src/data/programs.json',
        './src/data/funds.json',
        './src/data/departments.json'
      ],
      '/api/programs': ['./src/data/programs.json'],
      '/api/programs/[projectCode]': ['./src/data/programs.json'],
      '/api/search': ['./src/data/search.json'],
      '/api/send-email': ['./src/data/tweets/tweets.json']
    },
    // Exclude the large source directories (CSV/PDF files) but keep the JSON files
    outputFileTracingExcludes: {
      '*': [
        './src/data/vendors/**/*',
        './src/data/budget/**/*', 
        './src/data/workforce/**/*'
      ]
    }
  },
  // Optimize for serverless functions
  output: 'standalone',
  
  // Enable compression and optimizations (Turbopack handles most optimizations)
  compress: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,
  
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
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
      {
        protocol: 'https',
        hostname: 'youtube.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.youtube.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'youtu.be',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'x.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'twitter.com',
        pathname: '/**',
      },
    ],
  },
  // Ensure media files are handled properly
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: '/api/media/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 