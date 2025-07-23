// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      tenantId: string | null
      tenant: {
        id: string
        name: string
        subdomain: string
      } | null
      locations: {
        id: string
        name: string
        code: string
      }[]
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    tenantId: string | null
    tenant: {
      id: string
      name: string
      subdomain: string
    } | null
    locations: {
      id: string
      name: string
      code: string
    }[]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string
    tenantId: string | null
    tenant: {
      id: string
      name: string
      subdomain: string
    } | null
    locations: {
      id: string
      name: string
      code: string
    }[]
  }
}