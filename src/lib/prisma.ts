import { PrismaClient } from '@prisma/client'

// to avoid creating a new PrismaClient instance on every request in development
// we create a global variable to hold the PrismaClient instance
// this is a common pattern to prevent issues with too many connections in development
// nextjs hot reloading can cause multiple instances of PrismaClient to be created
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma