// Dynamic RBAC Permission Constants

export const PERMISSIONS = {
  // Super Admin
  ALL: '*',

  // Users
  USERS_VIEW: 'users.view',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',

  // Transactions
  TRANSACTIONS_VIEW: 'transactions.view',
  TRANSACTIONS_REFUND: 'transactions.refund',

  // Vendors
  VENDORS_VIEW: 'vendors.view',
  VENDORS_MANAGE: 'vendors.manage', // Toggle, Switch

  // Routing
  ROUTING_VIEW: 'routing.view',
  ROUTING_MANAGE: 'routing.manage',

  // Pricing
  PRICING_VIEW: 'pricing.view',
  PRICING_MANAGE: 'pricing.manage',

  // Referrals
  REFERRALS_VIEW: 'referrals.view',
  REFERRALS_MANAGE: 'referrals.manage',

  // Targets
  TARGETS_VIEW: 'targets.view',
  TARGETS_MANAGE: 'targets.manage',

  // Notifications
  NOTIFICATIONS_SEND: 'notifications.send',

  // System
  SETTINGS_MANAGE: 'settings.manage',
  ROLES_MANAGE: 'roles.manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Check if a user has a specific permission
 * @param userPermissions Array of permissions the user has
 * @param requiredPermission The permission required for the action
 * @returns boolean
 */
export function hasPermission(userPermissions: string[] | undefined | null, requiredPermission: string): boolean {
  if (!userPermissions) return false;
  if (userPermissions.includes('*')) return true; // Super Admin Access
  return userPermissions.includes(requiredPermission);
}

/**
 * Group permissions for UI display
 */
export const PERMISSION_GROUPS = [
  {
    name: "Users",
    permissions: [
      { id: PERMISSIONS.USERS_VIEW, label: "View Users" },
      { id: PERMISSIONS.USERS_EDIT, label: "Edit Users" },
      { id: PERMISSIONS.USERS_DELETE, label: "Delete Users" },
    ]
  },
  {
    name: "Transactions",
    permissions: [
      { id: PERMISSIONS.TRANSACTIONS_VIEW, label: "View Transactions" },
      { id: PERMISSIONS.TRANSACTIONS_REFUND, label: "Refund Transactions" },
    ]
  },
  {
    name: "Vendors & Routing",
    permissions: [
      { id: PERMISSIONS.VENDORS_VIEW, label: "View Vendors" },
      { id: PERMISSIONS.VENDORS_MANAGE, label: "Manage Vendors" },
      { id: PERMISSIONS.ROUTING_VIEW, label: "View Routing" },
      { id: PERMISSIONS.ROUTING_MANAGE, label: "Manage Routing" },
    ]
  },
  {
    name: "Pricing & Finance",
    permissions: [
      { id: PERMISSIONS.PRICING_VIEW, label: "View Pricing" },
      { id: PERMISSIONS.PRICING_MANAGE, label: "Manage Pricing" },
    ]
  },
  {
    name: "Marketing (Targets & Referrals)",
    permissions: [
      { id: PERMISSIONS.REFERRALS_VIEW, label: "View Referrals" },
      { id: PERMISSIONS.REFERRALS_MANAGE, label: "Manage Referrals" },
      { id: PERMISSIONS.TARGETS_VIEW, label: "View Targets" },
      { id: PERMISSIONS.TARGETS_MANAGE, label: "Manage Targets" },
    ]
  },
  {
    name: "System",
    permissions: [
      { id: PERMISSIONS.NOTIFICATIONS_SEND, label: "Send Notifications" },
      { id: PERMISSIONS.SETTINGS_MANAGE, label: "System Settings" },
      { id: PERMISSIONS.ROLES_MANAGE, label: "Manage Roles & Access" },
    ]
  }
];
