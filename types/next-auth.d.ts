import 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  /**
   * Extend the built-in session.user type
   */
  interface User {
    id: string
    role: Role
    phone: string
    isVerified: boolean
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      phone: string
      isVerified: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend the built-in JWT type
   */
  interface JWT {
    id: string
    role: Role
    phone: string
    isVerified: boolean
  }
}
