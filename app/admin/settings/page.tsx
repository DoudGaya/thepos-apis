"use client"

import React, { useEffect, useState } from 'react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

interface SettingsData {
  general: {
    companyName: string
    supportEmail: string
    supportPhone: string
    brandColors: {
      primary: string
      secondary: string
      accent: string
    }
    logoUrl: string
    websiteUrl: string
  }
  payment: {
    paystack: {
      publicKey: string
      secretKey: string
      enabled: boolean
      testMode: boolean
    }
    flutterwave: {
      publicKey: string
      secretKey: string
      enabled: boolean
      testMode: boolean
    }
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
    smtp: {
      host: string
      port: number
      secure: boolean
      username: string
      password: string
      fromEmail: string
      fromName: string
    }
    templates: Record<string, {
      subject: string
      enabled: boolean
    }>
  }
  security: {
    sessionTimeout: number
    passwordPolicy: {
      minLength: number
      requireUppercase: boolean
      requireLowercase: boolean
      requireNumbers: boolean
      requireSymbols: boolean
    }
    twoFactorAuth: {
      enabled: boolean
      required: boolean
    }
    rateLimiting: {
      enabled: boolean
      maxRequests: number
      windowMs: number
    }
    ipWhitelist: string[]
    ipBlacklist: string[]
  }
  notifications: {
    email: {
      enabled: boolean
      transactional: boolean
      marketing: boolean
    }
    sms: {
      enabled: boolean
      provider: string
      transactional: boolean
    }
    push: {
      enabled: boolean
      fcmKey: string
    }
  }
  stats: {
    totalUsers: number
    activeUsers: number
    totalTransactions: number
    systemHealth: string
    lastBackup: string
  }
}

const tabs = [
  { id: 'general', label: 'General', icon: '🏢' },
  { id: 'payment', label: 'Payment', icon: '💳' },
  { id: 'system', label: 'System', icon: '⚙️' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
]

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      const result = await response.json()

      if (result.success) {
        setSettings(result.data)
      }
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          settings: newSettings,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert('Settings updated successfully!')
        if (result.data.requiresRestart) {
          alert('Some changes require a system restart to take effect.')
        }
        fetchSettings() // Refresh settings
        setUnsavedChanges({ ...unsavedChanges, [category]: false })
      } else {
        alert('Failed to update settings')
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
      alert('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = (category: string, field: string, value: any) => {
    if (!settings) return

    const updatedSettings = { ...settings }
    const keys = field.split('.')

    let current: any = updatedSettings[category as keyof SettingsData]
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value

    setSettings(updatedSettings)
    setUnsavedChanges({ ...unsavedChanges, [category]: true })
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading settings...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center text-red-500">
        Failed to load settings
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Settings</h1>
          <p className="text-sm text-gray-600">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSettings}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              const confirmed = confirm('This will reset all settings to defaults. Continue?')
              if (confirmed) {
                // Reset logic would go here
                alert('Reset functionality not yet implemented')
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
          <p className="text-xl font-bold">{settings.stats.totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Active Users</h3>
          <p className="text-xl font-bold">{settings.stats.activeUsers.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Total Transactions</h3>
          <p className="text-xl font-bold">{settings.stats.totalTransactions.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">System Health</h3>
          <p className={`text-xl font-bold ${
            settings.stats.systemHealth === 'healthy' ? 'text-green-600' : 'text-red-600'
          }`}>
            {settings.stats.systemHealth}
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {unsavedChanges[tab.id] && (
                  <span className="ml-2 w-2 h-2 bg-orange-500 rounded-full"></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium">General Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={settings.general.companyName}
                    onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => handleSettingChange('general', 'supportEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Phone
                  </label>
                  <PhoneInput
                    international
                    defaultCountry="NG"
                    value={settings.general.supportPhone}
                    onChange={(value) => handleSettingChange('general', 'supportPhone', value || '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&>input]:outline-none [&>input]:bg-transparent [&>input]:w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={settings.general.websiteUrl}
                    onChange={(e) => handleSettingChange('general', 'websiteUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Colors
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Primary</label>
                    <input
                      type="color"
                      value={settings.general.brandColors.primary}
                      onChange={(e) => handleSettingChange('general', 'brandColors.primary', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Secondary</label>
                    <input
                      type="color"
                      value={settings.general.brandColors.secondary}
                      onChange={(e) => handleSettingChange('general', 'brandColors.secondary', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Accent</label>
                    <input
                      type="color"
                      value={settings.general.brandColors.accent}
                      onChange={(e) => handleSettingChange('general', 'brandColors.accent', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => updateSettings('general', settings.general)}
                  disabled={saving || !unsavedChanges.general}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save General Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium">Payment Gateway Settings</h2>

              {/* Paystack */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium">Paystack</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.payment.paystack.enabled}
                      onChange={(e) => handleSettingChange('payment', 'paystack.enabled', e.target.checked)}
                      className="mr-2"
                    />
                    Enabled
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Public Key
                    </label>
                    <input
                      type="password"
                      value={settings.payment.paystack.publicKey}
                      onChange={(e) => handleSettingChange('payment', 'paystack.publicKey', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="pk_test_..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      value={settings.payment.paystack.secretKey}
                      onChange={(e) => handleSettingChange('payment', 'paystack.secretKey', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="sk_test_..."
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.payment.paystack.testMode}
                      onChange={(e) => handleSettingChange('payment', 'paystack.testMode', e.target.checked)}
                      className="mr-2"
                    />
                    Test Mode
                  </label>
                </div>
              </div>

              {/* Flutterwave */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium">Flutterwave</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.payment.flutterwave.enabled}
                      onChange={(e) => handleSettingChange('payment', 'flutterwave.enabled', e.target.checked)}
                      className="mr-2"
                    />
                    Enabled
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Public Key
                    </label>
                    <input
                      type="password"
                      value={settings.payment.flutterwave.publicKey}
                      onChange={(e) => handleSettingChange('payment', 'flutterwave.publicKey', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="FLWPUBK_TEST-..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      value={settings.payment.flutterwave.secretKey}
                      onChange={(e) => handleSettingChange('payment', 'flutterwave.secretKey', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="FLWSECK_TEST-..."
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.payment.flutterwave.testMode}
                      onChange={(e) => handleSettingChange('payment', 'flutterwave.testMode', e.target.checked)}
                      className="mr-2"
                    />
                    Test Mode
                  </label>
                </div>
              </div>

              {/* Payment Preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Gateway
                  </label>
                  <select
                    value={settings.payment.defaultGateway}
                    onChange={(e) => handleSettingChange('payment', 'defaultGateway', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="paystack">Paystack</option>
                    <option value="flutterwave">Flutterwave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={settings.payment.currency}
                    onChange={(e) => handleSettingChange('payment', 'currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => updateSettings('payment', settings.payment)}
                  disabled={saving || !unsavedChanges.payment}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Payment Settings'}
                </button>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium">System Configuration</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Currency
                  </label>
                  <select
                    value={settings.system.defaultCurrency}
                    onChange={(e) => handleSettingChange('system', 'defaultCurrency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.system.timezone}
                    onChange={(e) => handleSettingChange('system', 'timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Africa/Lagos">West Africa (UTC+1)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (UTC-5)</option>
                    <option value="Europe/London">London (UTC+0)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.system.dateFormat}
                    onChange={(e) => handleSettingChange('system', 'dateFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Format
                  </label>
                  <select
                    value={settings.system.timeFormat}
                    onChange={(e) => handleSettingChange('system', 'timeFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="12h">12 Hour</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Items Per Page
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.system.itemsPerPage}
                    onChange={(e) => handleSettingChange('system', 'itemsPerPage', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max File Size
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.system.maxFileSize / (1024 * 1024)}
                      onChange={(e) => handleSettingChange('system', 'maxFileSize', parseInt(e.target.value) * 1024 * 1024)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md">MB</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {formatFileSize(settings.system.maxFileSize)}
                  </p>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.system.maintenanceMode}
                    onChange={(e) => handleSettingChange('system', 'maintenanceMode', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  When enabled, the system will show a maintenance page to all users except admins.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => updateSettings('system', settings.system)}
                  disabled={saving || !unsavedChanges.system}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save System Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium">Email Configuration</h2>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium mb-4">SMTP Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={settings.email.smtp.host}
                      onChange={(e) => handleSettingChange('email', 'smtp.host', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      value={settings.email.smtp.port}
                      onChange={(e) => handleSettingChange('email', 'smtp.port', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={settings.email.smtp.username}
                      onChange={(e) => handleSettingChange('email', 'smtp.username', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={settings.email.smtp.password}
                      onChange={(e) => handleSettingChange('email', 'smtp.password', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Email
                    </label>
                    <input
                      type="email"
                      value={settings.email.smtp.fromEmail}
                      onChange={(e) => handleSettingChange('email', 'smtp.fromEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Name
                    </label>
                    <input
                      type="text"
                      value={settings.email.smtp.fromName}
                      onChange={(e) => handleSettingChange('email', 'smtp.fromName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.email.smtp.secure}
                      onChange={(e) => handleSettingChange('email', 'smtp.secure', e.target.checked)}
                      className="mr-2"
                    />
                    Use SSL/TLS
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium mb-4">Email Templates</h3>

                <div className="space-y-4">
                  {Object.entries(settings.email.templates).map(([key, template]) => (
                    <div key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div>
                        <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="text-sm text-gray-500">{template.subject}</div>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={template.enabled}
                          onChange={(e) => handleSettingChange('email', `templates.${key}.enabled`, e.target.checked)}
                          className="mr-2"
                        />
                        Enabled
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => updateSettings('email', settings.email)}
                  disabled={saving || !unsavedChanges.email}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium">Security Configuration</h2>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium mb-4">Password Policy</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Length
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="128"
                      value={settings.security.passwordPolicy.minLength}
                      onChange={(e) => handleSettingChange('security', 'passwordPolicy.minLength', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout
                    </label>
                    <select
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1800000">30 minutes</option>
                      <option value="3600000">1 hour</option>
                      <option value="7200000">2 hours</option>
                      <option value="86400000">24 hours</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {formatDuration(settings.security.sessionTimeout)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.security.passwordPolicy.requireUppercase}
                      onChange={(e) => handleSettingChange('security', 'passwordPolicy.requireUppercase', e.target.checked)}
                      className="mr-2"
                    />
                    Require uppercase letters
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.security.passwordPolicy.requireLowercase}
                      onChange={(e) => handleSettingChange('security', 'passwordPolicy.requireLowercase', e.target.checked)}
                      className="mr-2"
                    />
                    Require lowercase letters
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.security.passwordPolicy.requireNumbers}
                      onChange={(e) => handleSettingChange('security', 'passwordPolicy.requireNumbers', e.target.checked)}
                      className="mr-2"
                    />
                    Require numbers
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.security.passwordPolicy.requireSymbols}
                      onChange={(e) => handleSettingChange('security', 'passwordPolicy.requireSymbols', e.target.checked)}
                      className="mr-2"
                    />
                    Require symbols
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium mb-4">Two-Factor Authentication</h3>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.security.twoFactorAuth.enabled}
                      onChange={(e) => handleSettingChange('security', 'twoFactorAuth.enabled', e.target.checked)}
                      className="mr-2"
                    />
                    Enable 2FA for all users
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.security.twoFactorAuth.required}
                      onChange={(e) => handleSettingChange('security', 'twoFactorAuth.required', e.target.checked)}
                      className="mr-2"
                    />
                    Require 2FA for login
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium mb-4">Rate Limiting</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Requests
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={settings.security.rateLimiting.maxRequests}
                      onChange={(e) => handleSettingChange('security', 'rateLimiting.maxRequests', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Window
                    </label>
                    <select
                      value={settings.security.rateLimiting.windowMs}
                      onChange={(e) => handleSettingChange('security', 'rateLimiting.windowMs', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="60000">1 minute</option>
                      <option value="300000">5 minutes</option>
                      <option value="900000">15 minutes</option>
                      <option value="3600000">1 hour</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.security.rateLimiting.enabled}
                      onChange={(e) => handleSettingChange('security', 'rateLimiting.enabled', e.target.checked)}
                      className="mr-2"
                    />
                    Enable rate limiting
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => updateSettings('security', settings.security)}
                  disabled={saving || !unsavedChanges.security}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Security Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium">Notification Settings</h2>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium mb-4">Email Notifications</h3>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email.enabled}
                      onChange={(e) => handleSettingChange('notifications', 'email.enabled', e.target.checked)}
                      className="mr-2"
                    />
                    Enable email notifications
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email.transactional}
                      onChange={(e) => handleSettingChange('notifications', 'email.transactional', e.target.checked)}
                      className="mr-2"
                    />
                    Transactional emails (receipts, confirmations)
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email.marketing}
                      onChange={(e) => handleSettingChange('notifications', 'email.marketing', e.target.checked)}
                      className="mr-2"
                    />
                    Marketing emails (promotions, newsletters)
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium mb-4">SMS Notifications</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMS Provider
                    </label>
                    <select
                      value={settings.notifications.sms.provider}
                      onChange={(e) => handleSettingChange('notifications', 'sms.provider', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="twilio">Twilio</option>
                      <option value="africastalking">Africa's Talking</option>
                      <option value="termii">Termii</option>
                    </select>
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms.enabled}
                      onChange={(e) => handleSettingChange('notifications', 'sms.enabled', e.target.checked)}
                      className="mr-2"
                    />
                    Enable SMS notifications
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms.transactional}
                      onChange={(e) => handleSettingChange('notifications', 'sms.transactional', e.target.checked)}
                      className="mr-2"
                    />
                    Transactional SMS (receipts, OTPs)
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium mb-4">Push Notifications</h3>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.push.enabled}
                      onChange={(e) => handleSettingChange('notifications', 'push.enabled', e.target.checked)}
                      className="mr-2"
                    />
                    Enable push notifications
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FCM Server Key
                    </label>
                    <input
                      type="password"
                      value={settings.notifications.push.fcmKey}
                      onChange={(e) => handleSettingChange('notifications', 'push.fcmKey', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="AAAA...Firebase Cloud Messaging Key"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => updateSettings('notifications', settings.notifications)}
                  disabled={saving || !unsavedChanges.notifications}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}