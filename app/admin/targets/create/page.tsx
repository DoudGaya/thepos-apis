'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react"
import Link from 'next/link'

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from 'sonner'

const formSchema = z.object({
    title: z.string().min(2, {
        message: "Title must be at least 2 characters.",
    }),
    description: z.string().optional(),
    type: z.string({
        required_error: "Please select a target type.",
    }),
    period: z.string({
        required_error: "Please select a period.",
    }),
    targetValue: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Target value must be a positive number",
    }),
    rewardAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Reward amount must be a positive number",
    }),
    audience: z.enum(["ALL", "SPECIFIC"], {
        required_error: "You need to select an audience type.",
    }),
})

export default function CreateTargetPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [specificUsers, setSpecificUsers] = useState<string[]>([])
    const [userIdInput, setUserIdInput] = useState('')

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            type: "AMOUNT_SPENT",
            period: "WEEKLY",
            targetValue: "",
            rewardAmount: "",
            audience: "ALL",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        // If audience is SPECIFIC but no users added, warn
        if (values.audience === "SPECIFIC" && specificUsers.length === 0) {
            toast.error("Please add at least one User ID for specific audience")
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/marketing/targets/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...values,
                    targetValue: parseFloat(values.targetValue),
                    rewardAmount: parseFloat(values.rewardAmount),
                    specificUserIds: values.audience === 'SPECIFIC' ? specificUsers : undefined
                })
            })

            if (response.ok) {
                toast.success("Target created successfully")
                router.push('/admin/targets')
                router.refresh()
            } else {
                const errorData = await response.json()
                toast.error(errorData.error || "Failed to create target")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    const addUser = () => {
        if (userIdInput && !specificUsers.includes(userIdInput)) {
            setSpecificUsers([...specificUsers, userIdInput])
            setUserIdInput('')
        }
    }

    const removeUser = (id: string) => {
        setSpecificUsers(specificUsers.filter(uid => uid !== id))
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-10">
            <div className="flex items-center space-x-4">
                <Link href="/admin/targets">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create Sales Target</h1>
                    <p className="text-muted-foreground">Setup rules and rewards for a new campaign.</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Campaign Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Weekly Spender" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            This will be displayed to users in the app.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Explain how to achieve this target..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Rules & Rewards</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Target Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="AMOUNT_SPENT">Amount Spent</SelectItem>
                                                    <SelectItem value="TRANSACTION_COUNT">Transaction Count</SelectItem>
                                                    <SelectItem value="DATA_VOLUME">Data Volume</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="period"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Duration</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select period" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="DAILY">Daily</SelectItem>
                                                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                                                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="targetValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Target Value</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="50000" {...field} />
                                            </FormControl>
                                            <FormDescription>Value required to complete.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="rewardAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Reward Amount (₦)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="500" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Audience Targeting</CardTitle>
                            <CardDescription>Who should participate in this campaign?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="audience"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col space-y-1"
                                            >
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="ALL" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        All Users
                                                    </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="SPECIFIC" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        Specific Users
                                                    </FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {form.watch('audience') === 'SPECIFIC' && (
                                <div className="border rounded-md p-4 bg-muted/20">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Input
                                            placeholder="Enter User ID"
                                            value={userIdInput}
                                            onChange={(e) => setUserIdInput(e.target.value)}
                                            className="bg-background"
                                        />
                                        <Button type="button" onClick={addUser} variant="secondary">Add</Button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {specificUsers.length === 0 && (
                                            <span className="text-sm text-muted-foreground italic">No users added yet.</span>
                                        )}
                                        {specificUsers.map(id => (
                                            <div key={id} className="bg-background border px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm">
                                                <span className="font-mono text-xs text-muted-foreground">{id}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeUser(id)}
                                                    className="ml-1 text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/admin/targets">
                            <Button type="button" variant="outline">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Target
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}
