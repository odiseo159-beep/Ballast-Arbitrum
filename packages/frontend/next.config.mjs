/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @ballast/shared is published as raw TS source — Next must transpile it.
  transpilePackages: ['@ballast/shared'],
  experimental: {
    // wagmi pulls in some packages that benefit from this
    optimizePackageImports: ['wagmi', '@tanstack/react-query'],
  },
  // wagmi's @wagmi/connectors re-exports MetaMask + WalletConnect, each of
  // which pulls in optional deps (RN async-storage, pino-pretty) that aren't
  // needed in a browser-only injected-wallet flow. Stub them out at build.
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      'lokijs': false,
      'encoding': false,
    };
    return config;
  },
};

export default nextConfig;
