import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OAuth2Client } from 'google-auth-library';
import verifyAppleToken from 'verify-apple-id-token';
import jwt from 'jsonwebtoken';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
    try {
        const { token, provider, firstName, lastName } = await req.json();

        if (!token || !provider) {
            return NextResponse.json({ error: 'Missing token or provider' }, { status: 400 });
        }

        let email = '';
        let name = '';
        let emailVerified = false;

        if (provider === 'google') {
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: token,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                if (payload) {
                    email = payload.email || '';
                    name = payload.name || '';
                    emailVerified = payload.email_verified || false;
                }
            } catch (error) {
                console.error('Google token verification failed:', error);
                return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
            }
        } else if (provider === 'apple') {
            try {
                // Implement Apple token verification
                // token passed here is the identityToken
                const payload = await verifyAppleToken({
                    idToken: token,
                    clientId: process.env.APPLE_ID!,
                    nonce: 'nonce', // Optional: validate nonce if used
                });
                email = payload.email || '';
                emailVerified = payload.email_verified === 'true' || payload.email_verified === true;
                // Apple only sends name on first sign in, so might be passed in body
                name = `${firstName || ''} ${lastName || ''}`.trim();
            } catch (error) {
                console.error('Apple token verification failed:', error);
                return NextResponse.json({ error: 'Invalid Apple token' }, { status: 401 });
            }
        } else {
            return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
        }

        if (!email) {
            return NextResponse.json({ error: 'Could not retrieve email' }, { status: 400 });
        }

        // Upsert user
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Create new user
            // Generate a random password hash or leave null (since social login)
            // Generate a referral code
            const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            user = await prisma.user.create({
                data: {
                    email,
                    firstName: name.split(' ')[0] || 'User',
                    lastName: name.split(' ')[1] || '',
                    isVerified: emailVerified,
                    referralCode,
                    phone: `social_${Date.now()}`, // Temporary placeholder, user should update phone

                }
            });
        }

        // Generate a session token/JWT for the mobile app
        // We can use the same JWT secret as NextAuth
        const sessionToken = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified
            },
            process.env.NEXTAUTH_SECRET || 'secret',
            { expiresIn: '30d' }
        );

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isVerified: user.isVerified,
                phone: user.phone
            },
            token: sessionToken
        });

    } catch (error) {
        console.error('Mobile login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
