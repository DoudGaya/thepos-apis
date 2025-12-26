'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Loader2, Users, Trophy, Banknote, Power, Trash2 } from "lucide-react"
import { toast } from 'sonner'

export default function TargetDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [actionLoading, setActionLoading] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/marketing/targets/${params.id}/progress`)
            if (res.ok) {
                const json = await res.json()
                setData(json.data)
            }
        } catch (error) {
            toast.error('Failed to load target details')
        } finally {
            setLoading(false)
        }
    }, [params.id])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const toggleStatus = async () => {
        setActionLoading(true)
        try {
            const res = await fetch(`/api/marketing/targets/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !data.target.isActive })
            })

            if (res.ok) {
                const updated = await res.json()
                setData({ ...data, target: updated.target })
                toast.success(`Target ${updated.target.isActive ? 'Activated' : 'Deactivated'}`)
            } else {
                toast.error('Failed to update status')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!data) return <div className="p-8 text-center text-muted-foreground">Target not found</div>

    const { target, stats, participants } = data

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/admin/targets">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{target.title}</h1>
                            <Badge variant={target.isActive ? 'default' : 'secondary'} className={target.isActive ? 'bg-emerald-500' : ''}>
                                {target.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">{target.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={target.isActive ? "destructive" : "default"}
                        onClick={toggleStatus}
                        disabled={actionLoading}
                    >
                        <Power className="mr-2 h-4 w-4" />
                        {target.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Participants</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalParticipants}</div>
                        <p className="text-xs text-muted-foreground">Total users engaged</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <Trophy className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCompleted}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.totalParticipants > 0 ? Math.round((stats.totalCompleted / stats.totalParticipants) * 100) : 0}% completion rate
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rewards Paid</CardTitle>
                        <Banknote className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦{stats.totalRewardsPaid.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total value distributed</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Campaign Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Campaign Rules</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block mb-1">Type</span>
                                <span className="font-medium">{target.type}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Period</span>
                                <span className="font-medium">{target.period}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Target Value</span>
                                <span className="font-medium text-lg">{target.targetValue.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Reward</span>
                                <span className="font-medium text-lg text-emerald-600">₦{target.rewardAmount.toLocaleString()}</span>
                            </div>
                            <div className="col-span-2 pt-2 border-t">
                                <span className="text-muted-foreground block mb-1">Audience</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                        {target.audience === 'ALL' ? 'All Users' : 'Specific Users Only'}
                                    </span>
                                    {target.audience === 'SPECIFIC' && target.specificUserIds && (
                                        <Badge variant="outline">{target.specificUserIds.length} users</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Progress Table */}
                <Card className="md:col-span-2 lg:col-span-1 min-h-[400px]">
                    <CardHeader>
                        <CardTitle>Participant Progress</CardTitle>
                        <CardDescription>Real-time tracking of user performance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {participants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <Users className="h-8 w-8 mb-2 opacity-20" />
                                <p>No participants yet.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {participants.map((p: any) => {
                                        const progressPercent = Math.min(100, Math.round((p.currentValue / target.targetValue) * 100))
                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium truncate max-w-[120px]">
                                                            {p.user.firstName ? `${p.user.firstName} ${p.user.lastName}` : 'User'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground font-mono">{p.user.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-[40%]">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs text-muted-foreground">
                                                            {p.currentValue} / {target.targetValue}
                                                        </span>
                                                        <Progress value={progressPercent} className={`h-1.5 ${p.isClaimed ? 'bg-emerald-100' : ''}`} />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-xs">
                                                    {p.isClaimed ? (
                                                        <Badge className="bg-emerald-500 hover:bg-emerald-600">Claimed</Badge>
                                                    ) : progressPercent >= 100 ? (
                                                        <Badge variant="outline" className="text-emerald-600 border-emerald-600">Complete</Badge>
                                                    ) : (
                                                        <div className="text-muted-foreground">{progressPercent}%</div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
