import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler, getAuthenticatedUser, BadRequestError } from '@/lib/api-utils'

/**
 * POST /api/admin/referrals/groups/[id]/users
 * Add a user to a passive referral group
 */
export const POST = apiHandler(async (req, { params }) => {
    const user = await getAuthenticatedUser();
    if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required');

    const { id: groupId } = await params;
    const body = await req.json();
    const { email, phone } = body; // Identify user by email or phone

    if (!groupId) throw new BadRequestError('Group ID required');
    if (!email && !phone) throw new BadRequestError('Email or Phone required to identify user');

    // Find the user
    const targetUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: email || undefined },
                { phone: phone || undefined }
            ]
        }
    });

    if (!targetUser) throw new BadRequestError('User not found');

    // Update user
    const updatedUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: {
            passiveReferralGroupId: groupId
        }
    });

    return NextResponse.json({ message: 'User added to group', user: updatedUser });
});

/**
 * GET /api/admin/referrals/groups/[id]/users
 * List users in a group
 */
export const GET = apiHandler(async (req, { params }) => {
    const user = await getAuthenticatedUser();
    if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required');
    
    const { id: groupId } = await params;
    
    const users = await prisma.user.findMany({
        where: { passiveReferralGroupId: groupId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            referralCode: true,
            createdAt: true
        }
    });
    
    return NextResponse.json(users);
});

/**
 * DELETE /api/admin/referrals/groups/[id]/users
 * Remove a user from a passive referral group
 */
export const DELETE = apiHandler(async (req, { params }) => {
    const user = await getAuthenticatedUser();
    if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required');

    const { id: groupId } = await params;
    const body = await req.json();
    const { userId } = body;

    if (!groupId) throw new BadRequestError('Group ID required');
    if (!userId) throw new BadRequestError('User ID required');

    // Verify user is in this group
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!targetUser) throw new BadRequestError('User not found');
    if (targetUser.passiveReferralGroupId !== groupId) {
         throw new BadRequestError('User is not in this group');
    }

    // Update user to remove group
    await prisma.user.update({
        where: { id: userId },
        data: { passiveReferralGroupId: null }
    });

    return NextResponse.json({ message: 'User removed from group' });
});
