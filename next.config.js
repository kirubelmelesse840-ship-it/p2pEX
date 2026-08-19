/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" was needed for Vercel — Netlify uses @netlify/plugin-nextjs
  // which handles output on its own. We keep it off for Netlify compatibility.
  // (If you ever go back to Vercel, uncomment this line)
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;