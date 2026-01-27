'use server'

import { prisma as db } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/notifications"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const NotificationSchema = z.object({
    title: z.string().min(1, "Title is required"),
    message: z.string().min(1, "Message is required"),
    target: z.enum(["ALL", "SPECIFIC"]).default("ALL"),
    userId: z.string().nullable().optional(),
})

export async function sendNotificationAction(prevState: any, formData: FormData) {
    try {
        const rawData = {
            title: formData.get("title"),
            message: formData.get("message"),
            target: formData.get("target"),
            userId: formData.get("userId"),
        }
        console.log('[AdminNotificationsAction] Received raw data:', rawData);

        const validatedData = NotificationSchema.safeParse(rawData)

        if (!validatedData.success) {
            console.error('[AdminNotificationsAction] Validation FAILED:', validatedData.error.flatten());
            return {
                error: "Validation error",
                details: validatedData.error.flatten().fieldErrors,
            }
        }

        console.log('[AdminNotificationsAction] Validation successful');
        const { title, message, target, userId } = validatedData.data

        let targetUsers;

        if (target === "ALL") {
            targetUsers = await db.user.findMany({
                select: {
                    id: true,
                    pushToken: true,
                }
            })
        } else if (target === "SPECIFIC" && userId) {
            const user = await db.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    pushToken: true,
                }
            })
            targetUsers = user ? [user] : []
        } else {
            return { error: "Invalid target configuration" }
        }

        if (!targetUsers || targetUsers.length === 0) {
            console.log('[AdminNotificationsAction] No target users found');
            return { success: false, error: "No target users found." }
        }

        console.log(`[AdminNotificationsAction] Found ${targetUsers.length} target users`);

        // Send push notifications only to users with tokens
        const usersWithTokens = targetUsers.filter(u => u.pushToken);
        const tokens = usersWithTokens.map(u => u.pushToken as string);

        if (tokens.length > 0) {
            console.log(`[AdminNotificationsAction] Sending push to ${tokens.length} devices`);
            try {
                await sendPushNotification(tokens, title, message)
                console.log('[AdminNotificationsAction] Push sent successfully');
            } catch (err) {
                console.error('[AdminNotificationsAction] Error in sendPushNotification:', err);
            }
        } else {
            console.log('[AdminNotificationsAction] No push tokens found for target users');
        }

        console.log('[AdminNotificationsAction] Saving notifications to DB...');
        // ALWAYS save to database so the history reflects the intended campaign
        try {
            const created = await db.notification.createMany({
                data: targetUsers.map((user) => ({
                    userId: user.id,
                    title,
                    message,
                    type: "GENERAL",
                    isRead: false
                }))
            });
            console.log(`[AdminNotificationsAction] Created ${created.count} notification records in DB`);
        } catch (dbErr) {
            console.error('[AdminNotificationsAction] DB Error saving notifications:', dbErr);
            throw dbErr;
        }

        revalidatePath("/admin/notifications")

        return { success: true, message: `Notification sent to ${tokens.length} devices.` }

    } catch (error) {
        console.error("Failed to send notification:", error)
        return { error: "Failed to send notification" }
    }
}
