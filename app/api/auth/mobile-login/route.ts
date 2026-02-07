import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OAuth2Client } from 'google-auth-library';
import verifyAppleToken from 'verify-apple-id-token';
import { generateToken } from '@/lib/auth';

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
            const audiences = [
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_ANDROID_CLIENT_ID,
                process.env.GOOGLE_ANDROID_CLIENT_ID_2,
                process.env.GOOGLE_IOS_CLIENT_ID
            ].filter((id) => Boolean(id)) as string[];

            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: token,
                    audience: audiences.length > 0 ? audiences : process.env.GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                if (payload) {
                    email = payload.email || '';
                    name = payload.name || '';
                    emailVerified = payload.email_verified || false;
                }
            } catch (error: any) {
                console.error('Google token verification failed:', error.message);

                // Decode token without verification to see what's inside (for debugging)
                try {
                    const ticket = await googleClient.verifyIdToken({
                        idToken: token,
                        // Don't enforce audience here just to see what it is
                    });
                    const payload = ticket.getPayload();
                    console.log('DEBUG: Token Payload Audience:', payload?.aud);
                    console.log('DEBUG: Expected Audiences:', audiences);
                } catch (innerError) {
                    // If it fails even without audience check, try to decode manually
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        try {
                            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                            console.log('DEBUG: Manual Decode Audience:', payload.aud);
                        } catch (e) {
                            console.log('DEBUG: Failed to manual decode');
                        }
                    }
                    console.log('DEBUG: Expected Audiences:', audiences);
                }

                return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
            }
        } else if (provider === 'apple') {
            try {
                // Implement Apple token verification
                const payload = await verifyAppleToken({
                    idToken: token,
                    clientId: process.env.APPLE_ID!,
                    nonce: 'nonce',
                });
                email = payload.email || '';
                emailVerified = String(payload.email_verified) === 'true';
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

        // Generate tokens using the unified auth helper (uses JWT_SECRET)
        // Access token: 1 hour
        const accessToken = generateToken(
            { userId: user.id, role: user.role },
            '1h'
        );

        // Refresh token: 30 days
        const refreshToken = generateToken(
            { userId: user.id, role: user.role },
            '30d'
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
            accessToken,
            token: accessToken, // For backward compatibility
            refreshToken,
            // Onboarding status for social auth users
            onboarding: {
                needsPhone: !user.phone || user.phone.startsWith('social_'),
                needsPin: !user.pinHash,
                needsNames: !user.firstName || user.firstName === 'User' || !user.lastName,
            }
        });

    } catch (error) {
        console.error('Mobile login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
