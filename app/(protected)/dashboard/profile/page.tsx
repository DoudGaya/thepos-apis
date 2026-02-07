'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Bell,
  Camera,
} from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Profile form
  const [profileData, setProfileData] = useState({
    fullName: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: (session?.user as any)?.phone || '',
  })

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Settings
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    marketingEmails: false,
    twoFactorAuth: false,
  })

  const handleProfileUpdate = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // TODO: Implement profile update API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) throw new Error('Failed to update profile')

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: profileData.fullName,
          email: profileData.email,
          phone: profileData.phone,
        },
      })

      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    setError('')
    setSuccess('')

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('All password fields are required')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (!response.ok) throw new Error('Failed to change password')

      setSuccess('Password changed successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to change password. Please check your current password.')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsUpdate = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/profile/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) throw new Error('Failed to update settings')

      setSuccess('Settings updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to update settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information and preferences.</p>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-50 text-green-700 border-green-200 border p-3 rounded-md flex items-start gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 mt-0.5" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-destructive/15 text-destructive border-destructive/20 border p-3 rounded-md flex items-start gap-2 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Left Column: Profile & Personal Info */}
        <div className="space-y-6 lg:col-span-2">

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center border-2 border-border">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <Button variant="secondary" size="icon" className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-sm">
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <p className="font-medium">{session?.user?.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-9"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    {/* PhoneInput usually needs custom styling or a wrapper to look like Shadcn Input.
                         For now, we'll wrap it in a div that mimicking Input styles or just use it as is if it looks okay.
                         Or better, use Shadcn Input but PhoneInput is a specific component. 
                         I'll use the existing PhoneInput but try to style it, or just wrap it. 
                         Actually, let's just use standard Shadcn Input for phone if we can, but PhoneInput provides formatting.
                         I'll keep PhoneInput but add a class to make it look decent.
                     */}
                    <PhoneInput
                      international
                      defaultCountry="NG"
                      value={profileData.phone}
                      onChange={(value) => setProfileData({ ...profileData, phone: value || '' })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleProfileUpdate} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>

          {/* Security & Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your password and security settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePasswordChange} disabled={loading} variant="outline">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Notifications & Other Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Manage how you receive updates.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="email-notifs" className="flex flex-col space-y-1">
                  <span>Email Notifications</span>
                  <span className="font-normal text-xs text-muted-foreground">Receive transaction updates via email</span>
                </Label>
                <Switch
                  id="email-notifs"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="sms-notifs" className="flex flex-col space-y-1">
                  <span>SMS Notifications</span>
                  <span className="font-normal text-xs text-muted-foreground">Receive transaction alerts via SMS</span>
                </Label>
                <Switch
                  id="sms-notifs"
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="marketing" className="flex flex-col space-y-1">
                  <span>Marketing Emails</span>
                  <span className="font-normal text-xs text-muted-foreground">Receive promotional offers</span>
                </Label>
                <Switch
                  id="marketing"
                  checked={settings.marketingEmails}
                  onCheckedChange={(checked) => setSettings({ ...settings, marketingEmails: checked })}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSettingsUpdate} disabled={loading} className="w-full">
                Save Preferences
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Shield className="h-5 w-5" />
                Transaction PIN
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-700 mb-4">
                Secure your data purchases with a 4-digit PIN. Only you can authorize transactions.
              </p>
              <Button
                variant="default"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => window.location.href = '/dashboard/settings/security'}
              >
                Manage Transaction PIN
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
