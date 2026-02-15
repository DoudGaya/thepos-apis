'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Plus, Loader2, Users, UserPlus, Trash2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useOnClickOutside } from '@/hooks/use-on-click-outside'

interface PassiveReferralGroup {
  id: string
  name: string
  commissionPercent: number
  description?: string
  isActive: boolean
  _count: { users: number }
}

interface GroupUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
}

export function PassiveGroupsTab() {
  const [groups, setGroups] = useState<PassiveReferralGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Manage Users State
  const [selectedGroup, setSelectedGroup] = useState<PassiveReferralGroup | null>(null)
  const [groupUsers, setGroupUsers] = useState<GroupUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GroupUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Create Form State
  const [formData, setFormData] = useState({
    name: '',
    commissionPercent: '',
    description: ''
  })

  // Close search results when clicking outside
  useOnClickOutside(searchRef as React.RefObject<HTMLElement>, () => {
    setShowResults(false)
  })

  useEffect(() => {
    fetchGroups()
  }, [])

  // Search Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([])
        setShowResults(false)
        return
      }
      
      setIsSearching(true)
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}&limit=5`)
        const result = await res.json()
        
        // Handle common API response structure where users might be in data.users or directly in users if unwrapped
        // Based on api-utils: successResponse wraps in 'data' dictionary
        const users = result.data?.users || result.users || []
        
        if (Array.isArray(users)) {
           setSearchResults(users)
           setShowResults(true)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/admin/referrals/groups')
      if (!res.ok) throw new Error('Failed to fetch groups')
      const data = await res.json()
      setGroups(data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load referral groups')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/referrals/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to create group')
      }

      toast.success('Group created successfully')
      setIsCreateOpen(false)
      fetchGroups()
      setFormData({ name: '', commissionPercent: '', description: '' })
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openUserManager = async (group: PassiveReferralGroup) => {
    setSelectedGroup(group)
    setLoadingUsers(true)
    setSearchQuery('') // Reset search
    setSearchResults([])
    try {
      const res = await fetch(`/api/admin/referrals/groups/${group.id}/users`)
      const data = await res.json()
      setGroupUsers(data)
    } catch (error) {
       toast.error('Failed to load group users')
    } finally {
        setLoadingUsers(false)
    }
  }

  const handleAddUser = async (user: GroupUser) => {
    if (!selectedGroup) return
    setSubmitting(true)
    try {
        const payload = user.email ? { email: user.email } : { phone: user.phone }

        const res = await fetch(`/api/admin/referrals/groups/${selectedGroup.id}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.message || 'Failed to add user')
        }

        toast.success(`Added ${user.firstName || 'User'} to group`)
        setSearchQuery('')
        setShowResults(false)
        
        // Refresh list
        openUserManager(selectedGroup)
        fetchGroups() // Update count
    } catch (error: any) {
        toast.error(error.message)
    } finally {
        setSubmitting(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!selectedGroup || !confirm('Remove this user from the group?')) return
    
    try {
        const res = await fetch(`/api/admin/referrals/groups/${selectedGroup.id}/users`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        })

        if (!res.ok) throw new Error('Failed to remove user')

        toast.success('User removed from group')
        // Refresh list
        openUserManager(selectedGroup)
        fetchGroups() // Update count
    } catch (error: any) {
        toast.error(error.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-lg font-medium">Passive Profit Groups</h3>
           <p className="text-sm text-muted-foreground">Commission based on company profit for specific groups.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Passive Group</DialogTitle>
              <DialogDescription>
                Define a group that earns a percentage of profit from their referrals' transactions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. The Golden Cycle"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="percent">Commission on Profit (%)</Label>
                <Input
                  id="percent"
                  type="number"
                  placeholder="e.g. 10"
                  value={formData.commissionPercent}
                  onChange={(e) => setFormData({ ...formData, commissionPercent: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  placeholder="Internal description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group Name</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No passive groups found.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">
                    {group.name}
                    {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                  </TableCell>
                  <TableCell>{group.commissionPercent}% of Profit</TableCell>
                  <TableCell>{group._count.users} Users</TableCell>
                  <TableCell>
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openUserManager(group)}>
                        <Users className="h-4 w-4 mr-2" />
                        Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* User Manager Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Manage Users - {selectedGroup?.name}</DialogTitle>
                <DialogDescription>Add users to this passive earning group.</DialogDescription>
            </DialogHeader>
            
            <div className="border-b pb-4 space-y-2 relative" ref={searchRef}>
                 <Label>Add User to Group</Label>
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email or phone..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            if (e.target.value.length >= 2) setShowResults(true)
                        }}
                        onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-2.5">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                 </div>

                 {/* Search Results Dropdown */}
                 {showResults && (
                    <div className="absolute z-10 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-md max-h-[300px] overflow-y-auto">
                        {searchResults.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground text-center">No users found</div>
                        ) : (
                            searchResults.map((user) => (
                                <div 
                                    key={user.id} 
                                    className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex justify-between items-center"
                                    onClick={() => handleAddUser(user)}
                                >
                                    <div>
                                        <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{user.email} • {user.phone}</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={submitting}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                 )}
            </div>

            <div className="py-2 max-h-[400px] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingUsers ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">Loading...</TableCell>
                            </TableRow>
                        ) : groupUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No users in this group</TableCell>
                            </TableRow>
                        ) : (
                            groupUsers.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.firstName} {u.lastName}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>{u.phone}</TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                            onClick={() => handleRemoveUser(u.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
