/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'jsonwebtoken', 'nodemailer'],
  env: {
    PAIRGATE_API_KEY: process.env.PAIRGATE_API_KEY,
    PAIRGATE_BASE_URL: process.env.PAIRGATE_BASE_URL || 'https://api.pairgate.com/v1',
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
    TERMII_API_KEY: process.env.TERMII_API_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
