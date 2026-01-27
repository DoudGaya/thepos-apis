
import { PrismaClient, NotificationType } from '@prisma/client';
import { prisma } from '../prisma';

export interface PushNotificationMessage {
    to: string | string[];
    title: string;
    body: string;
    data?: any;
    sound?: 'default' | null;
    priority?: 'default' | 'normal' | 'high';
    channelId?: string;
}

export class NotificationService {
    private prisma: PrismaClient;
    private expoApiUrl = 'https://exp.host/--/api/v2/push/send';

    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || prisma;
    }

    /**
     * Send a push notification to specific expo push tokens
     */
    async sendExpoPushNotifications(messages: PushNotificationMessage[]) {
        try {
            const response = await fetch(this.expoApiUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify(messages),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending push notifications:', error);
            throw error;
        }
    }

    /**
     * Send notification to a specific user
     * Persists in DB and sends Push if token exists
     */
    async notifyUser(
        userId: string,
        title: string,
        message: string,
        type: NotificationType = 'GENERAL',
        data: any = {},
        tx?: any
    ) {
        const db = tx || this.prisma;
        // 1. Create DB Record
        const notification = await db.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                data,
            },
            include: {
                user: {
                    select: { pushToken: true } as any,
                },
            },
        });

        // Cast to access pushToken which might be missing in generated types
        const userWithToken = (notification as any).user as { pushToken?: string | null };

        // 2. Send Push if token exists
        if (userWithToken?.pushToken) {
            await this.sendExpoPushNotifications([{
                to: userWithToken.pushToken,
                title,
                body: message,
                data: { ...data, notificationId: notification.id, type },
                sound: 'default',
                priority: 'high',
            }]);
        }

        return notification;
    }

    /**
     * Broadcast notification to all users or a specific group
     */
    async broadcast(title: string, message: string, audience: 'ALL' | 'VERIFIED' | 'WITH_BALANCE' = 'ALL', type: NotificationType = 'GENERAL', data: any = {}) {
        let where: any = {};
        if (audience === 'VERIFIED') where.isVerified = true;
        if (audience === 'WITH_BALANCE') where.credits = { gt: 0 };

        // Get all users fitting criteria with push tokens
        // Explicitly cast result to include pushToken
        const users = (await this.prisma.user.findMany({
            where,
            select: { id: true, pushToken: true } as any,
        })) as unknown as { id: string; pushToken: string | null }[];

        // 1. Bulk Create DB Records (Prisma createMany is efficient)
        await this.prisma.notification.createMany({
            data: users.map(u => ({
                userId: u.id,
                title,
                message,
                type,
                data,
            })),
        });

        // 2. Send Push in batches
        // Expo recommends batching, but basic implementation first
        const pushMessages: PushNotificationMessage[] = users
            .filter(u => u.pushToken && u.pushToken.startsWith('ExponentPushToken'))
            .map(u => ({
                to: u.pushToken!,
                title,
                body: message,
                data: { ...data, type },
                sound: 'default',
                priority: 'high',
            }));

        if (pushMessages.length > 0) {
            // Chunk into batches of 100 for Expo
            const chunkSize = 100;
            for (let i = 0; i < pushMessages.length; i += chunkSize) {
                const chunk = pushMessages.slice(i, i + chunkSize);
                await this.sendExpoPushNotifications(chunk);
            }
        }

        return { count: users.length, pushed: pushMessages.length };
    }
}

export const notificationService = new NotificationService();
