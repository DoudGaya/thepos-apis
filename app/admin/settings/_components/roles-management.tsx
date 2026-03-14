"use client"

import { useState, useEffect } from "react"
import { PageLoader } from "@/app/admin/_components/page-loader"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { PERMISSIONS } from "@/lib/rbac"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

const PERMISSION_GROUPS = {
  'Users': [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_DELETE],
  'Transactions': [PERMISSIONS.TRANSACTIONS_VIEW, PERMISSIONS.TRANSACTIONS_REFUND],
  'Vendors': [PERMISSIONS.VENDORS_VIEW, PERMISSIONS.VENDORS_MANAGE],
  'Routing': [PERMISSIONS.ROUTING_VIEW, PERMISSIONS.ROUTING_MANAGE],
  'Pricing': [PERMISSIONS.PRICING_VIEW, PERMISSIONS.PRICING_MANAGE],
  'Referrals': [PERMISSIONS.REFERRALS_VIEW, PERMISSIONS.REFERRALS_MANAGE],
  'Targets': [PERMISSIONS.TARGETS_VIEW, PERMISSIONS.TARGETS_MANAGE],
  'Notifications': [PERMISSIONS.NOTIFICATIONS_SEND],
  'System': [PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.ROLES_MANAGE],
}

interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
  _count?: {
    users: number
  }
}

export function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  })

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles')
      if (response.ok) {
        const data = await response.json()
        setRoles(data)
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role)
      setFormData({
        name: role.name,
        description: role.description || "",
        permissions: role.permissions,
      })
    } else {
      setEditingRole(null)
      setFormData({
        name: "",
        description: "",
        permissions: [],
      })
    }
    setDialogOpen(true)
  }

  const handlePermissionToggle = (permission: string) => {
    setFormData(prev => {
      const newPermissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
      return { ...prev, permissions: newPermissions }
    })
  }

  const handleSubmit = async () => {
    try {
      const url = editingRole 
        ? `/api/admin/roles/${editingRole.id}` 
        : '/api/admin/roles'
      
      const method = editingRole ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setDialogOpen(false)
        fetchRoles()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save role")
      }
    } catch (error) {
      console.error("Failed to save role:", error)
      alert("Failed to save role")
    }
  }

  const handleDelete = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchRoles()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete role")
      }
    } catch (error) {
      console.error("Failed to delete role:", error)
      alert("Failed to delete role")
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Roles & Permissions</h2>
          <p className="text-sm text-gray-500">Manage admin roles and their access levels.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>{role._count?.users || 0}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map(p => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                    {role.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(role)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(role)}
                      disabled={(role._count?.users || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {roles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No roles defined. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              Define the role name and assign permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="e.g. Support Agent"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Role description..."
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-4">Permissions</h3>
              
              <div className="space-y-6">
                {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => (
                  <div key={group} className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{group}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox 
                            id={permission} 
                            checked={formData.permissions.includes(permission)}
                            onCheckedChange={() => handlePermissionToggle(permission)}
                          />
                          <label
                            htmlFor={permission}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
