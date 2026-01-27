'use client'

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { sendNotificationAction } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Send, History } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                </>
            ) : (
                <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                </>
            )}
        </Button>
    )
}

export default function NotificationsClient({ notifications }: { notifications: any[] }) {
    const [target, setTarget] = useState("ALL")

    async function clientAction(formData: FormData) {
        console.log('[NotificationsClient] Form submission started...');
        try {
            const result = await sendNotificationAction(null, formData)
            console.log('[NotificationsClient] Server action result:', result);
            if (result?.error) {
                toast.error(result.error)
            } else if (result?.success) {
                toast.success(result.message)
            }
        } catch (error) {
            console.error('[NotificationsClient] Submission error:', error);
            toast.error('An unexpected error occurred during submission');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Push Notifications</h1>
                    <p className="text-muted-foreground">
                        Send push notifications to your users' devices.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Send Notification</CardTitle>
                        <CardDescription>
                            Create a new push notification campaign.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={clientAction} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="e.g., New Feature Alert!"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    name="message"
                                    placeholder="Write your message here..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Target Audience</Label>
                                <RadioGroup
                                    name="target"
                                    defaultValue="ALL"
                                    onValueChange={setTarget}
                                    className="flex flex-col space-y-1"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="ALL" id="all" />
                                        <Label htmlFor="all">All Users</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="SPECIFIC" id="specific" />
                                        <Label htmlFor="specific">Specific User</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {target === "SPECIFIC" && (
                                <div className="space-y-2">
                                    <Label htmlFor="userId">User ID</Label>
                                    <Input
                                        id="userId"
                                        name="userId"
                                        placeholder="Enter User ID"
                                        required
                                    />
                                </div>
                            )}

                            <div className="pt-4">
                                <SubmitButton />
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Best Practices</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg bg-muted p-4">
                            <h3 className="font-medium">Keep it short</h3>
                            <p className="text-sm text-muted-foreground">
                                Users are more likely to read short, punchy messages. Aim for under 100 characters.
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted p-4">
                            <h3 className="font-medium">Timing matters</h3>
                            <p className="text-sm text-muted-foreground">
                                Avoid sending notifications late at night. Peak engagement times are typically mid-morning or early evening.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Sent Notifications History</CardTitle>
                    </div>
                    <CardDescription>
                        Recent notifications sent to users via system triggers or manual campaigns.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Notification</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Sent At</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notifications.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                            No notifications found in history.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    notifications.map((n) => (
                                        <TableRow key={n.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">
                                                        {n.user.firstName} {n.user.lastName}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {n.user.email}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col max-w-[300px]">
                                                    <span className="font-medium text-sm">{n.title}</span>
                                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                                        {n.message}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] uppercase">
                                                    {n.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                                            </TableCell>
                                            <TableCell>
                                                {n.isRead ? (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Read</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Sent</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
