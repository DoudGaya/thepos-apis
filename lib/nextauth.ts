import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || "",
      clientSecret: {
        appleId: process.env.APPLE_ID || "",
        teamId: process.env.APPLE_TEAM_ID || "",
        privateKey: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "",
        keyId: process.env.APPLE_KEY_ID || "",
      } as any,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        if (!user.isVerified) {
          throw new Error('Please verify your account first');
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          phone: user.phone,
          isVerified: user.isVerified,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user }) {
      // Authorization already checked in the authorize function
      // Just return true to allow the sign in
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Support relative URLs
      if (url.startsWith('/')) {
        // Default to dashboard instead of home
        if (url === '/') return `${baseUrl}/dashboard`;
        return `${baseUrl}${url}`;
      }
      
      // Support absolute URLs on same origin
      if (url.startsWith(baseUrl)) {
        // Default to dashboard instead of home
        if (url === baseUrl || url === `${baseUrl}/`) return `${baseUrl}/dashboard`;
        return url;
      }

      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in - populate token from user object
        token.id = user.id;
        token.role = (user as any).role;
        token.phone = (user as any).phone;
        token.isVerified = (user as any).isVerified;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
      } else if (trigger === 'update' && session) {
        // Only refresh from database when explicitly triggered by session update
        // This prevents excessive database queries on every request
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              firstName: true,
              lastName: true,
              role: true,
              isVerified: true,
              phone: true,
            },
          });

          if (dbUser) {
            token.firstName = dbUser.firstName;
            token.lastName = dbUser.lastName;
            token.role = dbUser.role;
            token.isVerified = dbUser.isVerified;
            token.phone = dbUser.phone;
            token.name = `${dbUser.firstName} ${dbUser.lastName}`;
          }
        } catch (error) {
          console.error('Error refreshing user data from database:', error);
          // Continue with existing token data if database query fails
        }
      }
      // Otherwise, return existing token without database query
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
        (session.user as any).isVerified = token.isVerified;
        (session.user as any).firstName = token.firstName;
        (session.user as any).lastName = token.lastName;
        session.user.name = token.name || "";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
