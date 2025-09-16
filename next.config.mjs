/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_EXPORT === 'true';
const nextConfig = {
  reactStrictMode: true,
  ...(isExport ? { output: 'export' } : {}),
  async redirects() {
    if (isExport) return [];
    return [
      { source: '/', destination: '/partner-logistics', permanent: false },
      { source: '/ozon', destination: '/partner-logistics', permanent: true },
      { source: '/ozon/:path*', destination: '/partner-logistics/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
