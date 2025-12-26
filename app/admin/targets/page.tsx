'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Target, ChevronRight, Loader2, Users } from "lucide-react"

interface SalesTarget {
    id: string
    title: string
    description: string
    type: string
    period: string
    targetValue: number
    rewardAmount: number
    isActive: boolean
    audience: 'ALL' | 'SPECIFIC'
    createdAt: string
    _count?: {
        progress: number
    }
}

export default function TargetsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [targets, setTargets] = useState<SalesTarget[]>([])

    useEffect(() => {
        fetchTargets()
    }, [])

    const fetchTargets = async () => {
        try {
            const res = await fetch('/api/marketing/targets/admin')
            if (res.ok) {
                const data = await res.json()
                setTargets(data.targets)
            }
        } catch (error) {
            console.error('Failed to fetch targets', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Targets</h1>
                    <p className="text-muted-foreground">
                        Manage sales campaigns, set goals, and track user progress.
                    </p>
                </div>
                <Link href="/admin/targets/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Target
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Campaigns</CardTitle>
                    <CardDescription>
                        View and manage all sales targets currently configured in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : targets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-muted p-4">
                                <Target className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">No targets created</h3>
                            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                                Get started by creating your first sales target campaign.
                            </p>
                            <Link href="/admin/targets/create">
                                <Button variant="outline">Create Initial Target</Button>
                            </Link>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Target Value</TableHead>
                                    <TableHead>Reward</TableHead>
                                    <TableHead>Audience</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {targets.map((target) => (
                                    <TableRow key={target.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/targets/${target.id}`)}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{target.title}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{target.description}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{target.type}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{target.period}</Badge>
                                        </TableCell>
                                        <TableCell>{target.targetValue.toLocaleString()}</TableCell>
                                        <TableCell className="text-emerald-600 font-medium">₦{target.rewardAmount.toLocaleString()}</TableCell>
                                        <TableCell>
                                            {target.audience === 'SPECIFIC' ? (
                                                <div className="flex items-center text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full w-fit">
                                                    <Users className="w-3 h-3 mr-1" /> Specific
                                                </div>
                                            ) : (
                                                <Badge variant="secondary">All Users</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={target.isActive ? 'default' : 'destructive'} className={target.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                                {target.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
