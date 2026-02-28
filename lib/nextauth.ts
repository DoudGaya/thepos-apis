import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

function generateReferralCode() {
  return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

const adapter = PrismaAdapter(prisma);
const originalCreateUser = adapter.createUser;

adapter.createUser = async (data) => {
  // Extract fields that might come from NextAuth but aren't in our Prisma schema
  const { name, image, emailVerified, ...rest } = data as any;
  
  let firstName = '', lastName = '';
  
  if (name) {
    const parts = name.split(' ');
    firstName = parts[0];
    lastName = parts.slice(1).join(' ');
  }

  // Create user with only the fields our schema supports
  const email = rest.email?.toLowerCase();
  
  return prisma.user.create({
    data: {
      ...rest,
      email,
      firstName: (rest.firstName) || firstName,
      lastName: (rest.lastName) || lastName,
      referralCode: generateReferralCode(),
      // Map emailVerified to isVerified if it exists (it's a Date in NextAuth)
      isVerified: !!emailVerified, 
    },
  }) as any;
};

export const authOptions: NextAuthOptions = {
  adapter: adapter as any,
  useSecureCookies: process.env.NODE_ENV === 'production',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
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
          where: { email: credentials.email.toLowerCase() },
          include: { adminRole: true },
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
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.role,
          phone: user.phone || '',
          isVerified: user.isVerified,
          firstName: user.firstName,
          lastName: user.lastName,
          permissions: user.adminRole?.permissions || [],
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
    async signIn({ user, account }) {
      // Authorization already checked in the authorize function
      // for Credentials provider.
      
      // Just return true to allow the sign in
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url === '/profile-completion') {
        return `${baseUrl}/profile-completion`;
      }
      
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
        token.permissions = (user as any).permissions;
      } else if ((trigger === 'update' && session) || (!token.isVerified && token.sub)) {
        // Refresh from database when explicitly triggered by session update
        // OR when the token says not verified but we have a user ID (to catch status changes)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            include: { adminRole: true },
          });

          if (dbUser) {
            // Update all fields to ensure consistency
            token.firstName = dbUser.firstName;
            token.lastName = dbUser.lastName;
            token.role = dbUser.role;
            token.isVerified = dbUser.isVerified;
            token.phone = dbUser.phone || '';
            token.name = `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim();
            token.permissions = dbUser.adminRole?.permissions || [];
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
        (session.user as any).permissions = token.permissions;
        session.user.name = token.name || "";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
