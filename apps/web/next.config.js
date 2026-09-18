/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ia-app/shared", "@ia-app/agent-core", "@ia-app/personality-core", "@ia-app/knowledge-core", "three"],
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
