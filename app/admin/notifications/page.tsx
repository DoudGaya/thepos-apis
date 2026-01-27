import { prisma } from "@/lib/prisma"
import NotificationsClient from "./NotificationsClient"

export default async function NotificationsPage() {
    const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });

    return (
        <NotificationsClient notifications={notifications} />
    )
}
