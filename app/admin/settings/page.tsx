"use client"

import React, { useEffect, useState } from 'react'
import { PageLoader } from '@/app/admin/_components/page-loader'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

interface SettingsData {
  general: {
    companyName: string
    supportEmail: string
    supportPhone: string
    brandColors: { primary: string; secondary: string; accent: string }
    logoUrl: string
    websiteUrl: string
  }
  payment: {
    paystack: { publicKey: string; secretKey: string; enabled: boolean; testMode: boolean }
    opay: { publicKey: string; secretKey: string; enabled: boolean }
    nomba: { clientId: string; clientSecret: string; accountId: string; enabled: boolean }
    monnify: { apiKey: string; secretKey: string; contractCode: string; baseUrl: string; enabled: boolean; testMode: boolean }
    defaultGateway: string
    currency: string
  }
  system: {
    maintenanceMode: boolean
    defaultCurrency: string
    timezone: string
    dateFormat: string
    timeFormat: string
    language: string
    itemsPerPage: number
    maxFileSize: number
    sessionTimeout: number
  }
  email: {
    smtp: { host: string; port: number; secure: boolean; username: string; password: string; fromEmail: string; fromName: string }
    templates: Record<string, { subject: string; enabled: boolean }>
  }
  security: {
    sessionTimeout: number
    passwordPolicy: { minLength: number; requireUppercase: boolean; requireLowercase: boolean; requireNumbers: boolean; requireSymbols: boolean }
    twoFactorAuth: { enabled: boolean; required: boolean }
    rateLimiting: { enabled: boolean; maxRequests: number; windowMs: number }
    ipWhitelist: string[]
    ipBlacklist: string[]
  }
  notifications: {
    email: { enabled: boolean; transactional: boolean; marketing: boolean }
    sms: { enabled: boolean; provider: string; transactional: boolean }
    push: { enabled: boolean; fcmKey: string }
  }
  referral: {
    withdrawalsOpen: boolean
    cashoutDay: number
  }
  stats: {
    totalUsers: number
    activeUsers: number
    totalTransactions: number
    systemHealth: string
    lastBackup: string
  }
}

import { RolesManagement } from './_components/roles-management'

const TABS = [
  { id: 'general',       label: 'General',             icon: '🏢' },
  { id: 'roles',         label: 'Roles & Permissions', icon: '🛡️' },
  { id: 'payment',       label: 'Payment Gateways',    icon: '💳' },
  { id: 'system',        label: 'System',               icon: '⚙️' },
  { id: 'email',         label: 'Email',                icon: '📧' },
  { id: 'security',      label: 'Security',             icon: '🔒' },
  { id: 'notifications', label: 'Notifications',        icon: '🔔' },
  { id: 'referral',      label: 'Referral',             icon: '🎁' },
]

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({})

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings')
      const result = await response.json()
      if (result.success) setSettings(result.data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (category: string, newSettings: any) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, settings: newSettings }),
      })
      const result = await response.json()
      if (result.success) {
        fetchSettings()
        setUnsavedChanges(p => ({ ...p, [category]: false }))
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = (category: string, field: string, value: any) => {
    if (!settings) return
    const updatedSettings = { ...settings } as any
    const keys = field.split('.')
    let current = updatedSettings[category]
    for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]]
    current[keys[keys.length - 1]] = value
    setSettings(updatedSettings)
    setUnsavedChanges(p => ({ ...p, [category]: true }))
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) return <PageLoader />

  if (!settings) {
    return <div className="text-center text-destructive">Failed to load settings.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure system-wide preferences and integrations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',   value: settings.stats.totalUsers.toLocaleString() },
          { label: 'Active Users',  value: settings.stats.activeUsers.toLocaleString() },
          { label: 'Transactions',  value: settings.stats.totalTransactions.toLocaleString() },
          { label: 'System Health', value: settings.stats.systemHealth, health: true },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.health ? (s.value === 'healthy' ? 'text-emerald-500' : 'text-destructive') : ''}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-52 shrink-0">
          <ul className="space-y-1">
            {TABS.map(t => (
              <li key={t.id}>
                <button
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left',
                    activeTab === t.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span>{t.icon}</span>
                  <span className="flex-1">{t.label}</span>
                  {unsavedChanges[t.id] && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0 space-y-4">

          {activeTab === 'general' && (
            <>
              <SectionCard title="Company Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRow label="Company Name">
                    <Input value={settings.general.companyName} onChange={e => handleSettingChange('general', 'companyName', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Support Email">
                    <Input type="email" value={settings.general.supportEmail} onChange={e => handleSettingChange('general', 'supportEmail', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Support Phone">
                    <PhoneInput
                      international defaultCountry="NG"
                      value={settings.general.supportPhone?.replace(/\s/g, '')}
                      onChange={v => handleSettingChange('general', 'supportPhone', v || '')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                    />
                  </FieldRow>
                  <FieldRow label="Website URL">
                    <Input type="url" value={settings.general.websiteUrl} onChange={e => handleSettingChange('general', 'websiteUrl', e.target.value)} />
                  </FieldRow>
                </div>
              </SectionCard>
              <SectionCard title="Brand Colors">
                <div className="grid grid-cols-3 gap-4">
                  {(['primary', 'secondary', 'accent'] as const).map(key => (
                    <FieldRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                      <input
                        type="color"
                        value={(settings.general.brandColors as any)[key]}
                        onChange={e => handleSettingChange('general', `brandColors.${key}`, e.target.value)}
                        className="w-full h-10 rounded-md border border-input cursor-pointer bg-background"
                      />
                    </FieldRow>
                  ))}
                </div>
              </SectionCard>
              <div className="flex justify-end">
                <Button onClick={() => updateSettings('general', settings.general)} disabled={saving || !unsavedChanges.general}>
                  {saving ? 'Saving…' : 'Save General Settings'}
                </Button>
              </div>
            </>
          )}

          {activeTab === 'roles' && <RolesManagement />}

          {activeTab === 'payment' && (
            <>
              <SectionCard title="Paystack">
                <ToggleRow label="Enabled" checked={settings.payment.paystack.enabled} onChange={v => handleSettingChange('payment', 'paystack.enabled', v)} />
                <ToggleRow label="Test Mode" desc="Use sandbox credentials" checked={settings.payment.paystack.testMode} onChange={v => handleSettingChange('payment', 'paystack.testMode', v)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <FieldRow label="Public Key">
                    <Input type="password" value={settings.payment.paystack.publicKey} onChange={e => handleSettingChange('payment', 'paystack.publicKey', e.target.value)} placeholder="pk_test_…" />
                  </FieldRow>
                  <FieldRow label="Secret Key">
                    <Input type="password" value={settings.payment.paystack.secretKey} onChange={e => handleSettingChange('payment', 'paystack.secretKey', e.target.value)} placeholder="sk_test_…" />
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="OPay">
                <ToggleRow label="Enabled" checked={settings.payment.opay?.enabled ?? false} onChange={v => handleSettingChange('payment', 'opay.enabled', v)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <FieldRow label="Public Key">
                    <Input type="password" value={settings.payment.opay?.publicKey ?? ''} onChange={e => handleSettingChange('payment', 'opay.publicKey', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Secret Key">
                    <Input type="password" value={settings.payment.opay?.secretKey ?? ''} onChange={e => handleSettingChange('payment', 'opay.secretKey', e.target.value)} />
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="Nomba">
                <ToggleRow label="Enabled" checked={settings.payment.nomba?.enabled ?? false} onChange={v => handleSettingChange('payment', 'nomba.enabled', v)} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <FieldRow label="Client ID">
                    <Input value={settings.payment.nomba?.clientId ?? ''} onChange={e => handleSettingChange('payment', 'nomba.clientId', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Client Secret">
                    <Input type="password" value={settings.payment.nomba?.clientSecret ?? ''} onChange={e => handleSettingChange('payment', 'nomba.clientSecret', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Account ID">
                    <Input value={settings.payment.nomba?.accountId ?? ''} onChange={e => handleSettingChange('payment', 'nomba.accountId', e.target.value)} />
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="Monnify">
                <ToggleRow label="Enabled" checked={settings.payment.monnify?.enabled ?? false} onChange={v => handleSettingChange('payment', 'monnify.enabled', v)} />
                <ToggleRow label="Test Mode" checked={settings.payment.monnify?.testMode ?? false} onChange={v => handleSettingChange('payment', 'monnify.testMode', v)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <FieldRow label="API Key">
                    <Input type="password" value={settings.payment.monnify?.apiKey ?? ''} onChange={e => handleSettingChange('payment', 'monnify.apiKey', e.target.value)} placeholder="MK_…" />
                  </FieldRow>
                  <FieldRow label="Secret Key">
                    <Input type="password" value={settings.payment.monnify?.secretKey ?? ''} onChange={e => handleSettingChange('payment', 'monnify.secretKey', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Contract Code">
                    <Input value={settings.payment.monnify?.contractCode ?? ''} onChange={e => handleSettingChange('payment', 'monnify.contractCode', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Environment">
                    <Select value={settings.payment.monnify?.baseUrl ?? 'https://sandbox.monnify.com'} onValueChange={v => handleSettingChange('payment', 'monnify.baseUrl', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="https://sandbox.monnify.com">Sandbox</SelectItem>
                        <SelectItem value="https://api.monnify.com">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="Payment Preferences">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRow label="Default Gateway">
                    <Select value={settings.payment.defaultGateway} onValueChange={v => handleSettingChange('payment', 'defaultGateway', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paystack">Paystack</SelectItem>
                        <SelectItem value="opay">OPay</SelectItem>
                        <SelectItem value="nomba">Nomba</SelectItem>
                        <SelectItem value="monnify_va">Monnify Virtual Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Currency">
                    <Select value={settings.payment.currency} onValueChange={v => handleSettingChange('payment', 'currency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              </SectionCard>
              <div className="flex justify-end">
                <Button onClick={() => updateSettings('payment', settings.payment)} disabled={saving || !unsavedChanges.payment}>
                  {saving ? 'Saving…' : 'Save Payment Settings'}
                </Button>
              </div>
            </>
          )}

          {activeTab === 'system' && (
            <>
              <SectionCard title="Regional">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRow label="Default Currency">
                    <Select value={settings.system.defaultCurrency} onValueChange={v => handleSettingChange('system', 'defaultCurrency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Timezone">
                    <Select value={settings.system.timezone} onValueChange={v => handleSettingChange('system', 'timezone', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Lagos">West Africa (UTC+1)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time (UTC-5)</SelectItem>
                        <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Date Format">
                    <Select value={settings.system.dateFormat} onValueChange={v => handleSettingChange('system', 'dateFormat', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Time Format">
                    <Select value={settings.system.timeFormat} onValueChange={v => handleSettingChange('system', 'timeFormat', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12 Hour</SelectItem>
                        <SelectItem value="24h">24 Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              </SectionCard>
              <SectionCard title="Limits & Performance">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRow label="Items Per Page">
                    <Input type="number" min="5" max="100" value={settings.system.itemsPerPage} onChange={e => handleSettingChange('system', 'itemsPerPage', parseInt(e.target.value))} />
                  </FieldRow>
                  <FieldRow label={`Max File Size (${formatFileSize(settings.system.maxFileSize)})`}>
                    <div className="flex gap-2">
                      <Input type="number" min="1" max="100" value={settings.system.maxFileSize / (1024 * 1024)} onChange={e => handleSettingChange('system', 'maxFileSize', parseInt(e.target.value) * 1024 * 1024)} />
                      <span className="flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">MB</span>
                    </div>
                  </FieldRow>
                </div>
              </SectionCard>
              <SectionCard title="Maintenance">
                <ToggleRow
                  label="Maintenance Mode"
                  desc="When enabled, shows a maintenance page to all users except admins."
                  checked={settings.system.maintenanceMode}
                  onChange={v => handleSettingChange('system', 'maintenanceMode', v)}
                />
              </SectionCard>
              <div className="flex justify-end">
                <Button onClick={() => updateSettings('system', settings.system)} disabled={saving || !unsavedChanges.system}>
                  {saving ? 'Saving…' : 'Save System Settings'}
                </Button>
              </div>
            </>
          )}

          {activeTab === 'email' && (
            <>
              <SectionCard title="SMTP Configuration">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRow label="SMTP Host"><Input value={settings.email.smtp.host} onChange={e => handleSettingChange('email', 'smtp.host', e.target.value)} placeholder="smtp.gmail.com" /></FieldRow>
                  <FieldRow label="SMTP Port"><Input type="number" min="1" max="65535" value={settings.email.smtp.port} onChange={e => handleSettingChange('email', 'smtp.port', parseInt(e.target.value))} /></FieldRow>
                  <FieldRow label="Username"><Input value={settings.email.smtp.username} onChange={e => handleSettingChange('email', 'smtp.username', e.target.value)} /></FieldRow>
                  <FieldRow label="Password"><Input type="password" value={settings.email.smtp.password} onChange={e => handleSettingChange('email', 'smtp.password', e.target.value)} /></FieldRow>
                  <FieldRow label="From Email"><Input type="email" value={settings.email.smtp.fromEmail} onChange={e => handleSettingChange('email', 'smtp.fromEmail', e.target.value)} /></FieldRow>
                  <FieldRow label="From Name"><Input value={settings.email.smtp.fromName} onChange={e => handleSettingChange('email', 'smtp.fromName', e.target.value)} /></FieldRow>
                </div>
                <Separator />
                <ToggleRow label="Use SSL/TLS" checked={settings.email.smtp.secure} onChange={v => handleSettingChange('email', 'smtp.secure', v)} />
              </SectionCard>
              <SectionCard title="Email Templates">
                <div className="space-y-1">
                  {Object.entries(settings.email.templates).map(([key, tpl]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-xs text-muted-foreground">{tpl.subject}</p>
                        </div>
                        <Switch checked={tpl.enabled} onCheckedChange={v => handleSettingChange('email', `templates.${key}.enabled`, v)} />
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>
              </SectionCard>
              <div className="flex justify-end">
                <Button onClick={() => updateSettings('email', settings.email)} disabled={saving || !unsavedChanges.email}>
                  {saving ? 'Saving…' : 'Save Email Settings'}
                </Button>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <SectionCard title="Password Policy">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRow label="Minimum Length">
                    <Input type="number" min="6" max="128" value={settings.security.passwordPolicy.minLength} onChange={e => handleSettingChange('security', 'passwordPolicy.minLength', parseInt(e.target.value))} />
                  </FieldRow>
                  <FieldRow label="Session Timeout">
                    <Select value={String(settings.security.sessionTimeout)} onValueChange={v => handleSettingChange('security', 'sessionTimeout', parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1800000">30 minutes</SelectItem>
                        <SelectItem value="3600000">1 hour</SelectItem>
                        <SelectItem value="7200000">2 hours</SelectItem>
                        <SelectItem value="86400000">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
                <Separator />
                <div className="space-y-1">
                  {([
                    { key: 'requireUppercase', label: 'Require uppercase letters' },
                    { key: 'requireLowercase', label: 'Require lowercase letters' },
                    { key: 'requireNumbers',   label: 'Require numbers' },
                    { key: 'requireSymbols',   label: 'Require symbols' },
                  ] as const).map(({ key, label }) => (
                    <div key={key}>
                      <ToggleRow
                        label={label}
                        checked={(settings.security.passwordPolicy as any)[key]}
                        onChange={v => handleSettingChange('security', `passwordPolicy.${key}`, v)}
                      />
                      <Separator />
                    </div>
                  ))}
                </div>
              </SectionCard>
              <SectionCard title="Two-Factor Authentication">
                <ToggleRow label="Enable 2FA" desc="Allow users to set up two-factor authentication" checked={settings.security.twoFactorAuth.enabled} onChange={v => handleSettingChange('security', 'twoFactorAuth.enabled', v)} />
                <Separator />
                <ToggleRow label="Require 2FA" desc="Require 2FA for all user logins" checked={settings.security.twoFactorAuth.required} onChange={v => handleSettingChange('security', 'twoFactorAuth.required', v)} />
              </SectionCard>
              <SectionCard title="Rate Limiting">
                <ToggleRow label="Enable Rate Limiting" checked={settings.security.rateLimiting.enabled} onChange={v => handleSettingChange('security', 'rateLimiting.enabled', v)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <FieldRow label="Max Requests">
                    <Input type="number" min="1" max="10000" value={settings.security.rateLimiting.maxRequests} onChange={e => handleSettingChange('security', 'rateLimiting.maxRequests', parseInt(e.target.value))} />
                  </FieldRow>
                  <FieldRow label="Time Window">
                    <Select value={String(settings.security.rateLimiting.windowMs)} onValueChange={v => handleSettingChange('security', 'rateLimiting.windowMs', parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60000">1 minute</SelectItem>
                        <SelectItem value="300000">5 minutes</SelectItem>
                        <SelectItem value="900000">15 minutes</SelectItem>
                        <SelectItem value="3600000">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              </SectionCard>
              <div className="flex justify-end">
                <Button onClick={() => updateSettings('security', settings.security)} disabled={saving || !unsavedChanges.security}>
                  {saving ? 'Saving…' : 'Save Security Settings'}
                </Button>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <SectionCard title="Email Notifications">
                <div className="space-y-1">
                  <ToggleRow label="Enable Email Notifications" checked={settings.notifications.email.enabled} onChange={v => handleSettingChange('notifications', 'email.enabled', v)} />
                  <Separator />
                  <ToggleRow label="Transactional Emails" desc="Receipts, confirmations, OTPs" checked={settings.notifications.email.transactional} onChange={v => handleSettingChange('notifications', 'email.transactional', v)} />
                  <Separator />
                  <ToggleRow label="Marketing Emails" desc="Promotions and newsletters" checked={settings.notifications.email.marketing} onChange={v => handleSettingChange('notifications', 'email.marketing', v)} />
                </div>
              </SectionCard>
              <SectionCard title="SMS Notifications">
                <FieldRow label="SMS Provider">
                  <Select value={settings.notifications.sms.provider} onValueChange={v => handleSettingChange('notifications', 'sms.provider', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="africastalking">Africa's Talking</SelectItem>
                      <SelectItem value="termii">Termii</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <Separator />
                <div className="space-y-1">
                  <ToggleRow label="Enable SMS" checked={settings.notifications.sms.enabled} onChange={v => handleSettingChange('notifications', 'sms.enabled', v)} />
                  <Separator />
                  <ToggleRow label="Transactional SMS" desc="Receipts, OTPs" checked={settings.notifications.sms.transactional} onChange={v => handleSettingChange('notifications', 'sms.transactional', v)} />
                </div>
              </SectionCard>
              <SectionCard title="Push Notifications">
                <ToggleRow label="Enable Push Notifications" checked={settings.notifications.push.enabled} onChange={v => handleSettingChange('notifications', 'push.enabled', v)} />
                <FieldRow label="FCM Server Key">
                  <Input type="password" value={settings.notifications.push.fcmKey} onChange={e => handleSettingChange('notifications', 'push.fcmKey', e.target.value)} placeholder="AAAA…Firebase Cloud Messaging Key" />
                </FieldRow>
              </SectionCard>
              <div className="flex justify-end">
                <Button onClick={() => updateSettings('notifications', settings.notifications)} disabled={saving || !unsavedChanges.notifications}>
                  {saving ? 'Saving…' : 'Save Notification Settings'}
                </Button>
              </div>
            </>
          )}

          {activeTab === 'referral' && (
            <>
              <SectionCard title="Referral Withdrawals">
                <ToggleRow
                  label="Open Withdrawals (bypass 28th restriction)"
                  desc="When ON, users can withdraw any day. When OFF, withdrawals are limited to the 28th of the month."
                  checked={settings.referral?.withdrawalsOpen ?? false}
                  onChange={v => handleSettingChange('referral', 'withdrawalsOpen', v)}
                />
              </SectionCard>
              <div className="flex justify-end">
                <Button onClick={() => updateSettings('referral', settings.referral)} disabled={saving || !unsavedChanges.referral}>
                  {saving ? 'Saving…' : 'Save Referral Settings'}
                </Button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
