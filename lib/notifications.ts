import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export async function sendPushNotification(
    pushTokens: string[],
    title: string,
    body: string,
    data?: any
) {
    const messages: ExpoPushMessage[] = [];

    for (const pushToken of pushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }

        messages.push({
            to: pushToken,
            sound: 'default',
            title: title,
            body: body,
            data: data || {},
        });
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log('Push notification tickets:', ticketChunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error('Error sending push notifications:', error);
        }
    }

    return tickets;
}
