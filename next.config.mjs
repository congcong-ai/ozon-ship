/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_EXPORT === 'true';
const nextConfig = {
  reactStrictMode: true,
  ...(isExport ? { output: 'export' } : {}),
};

export default nextConfig;
