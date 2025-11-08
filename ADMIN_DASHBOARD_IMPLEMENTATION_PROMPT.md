# Comprehensive Admin Dashboard Implementation Prompt

## **Project Context**
You are implementing a complete admin dashboard for "The POS" - a Nigerian VTU platform. The system uses Next.js 15 with App Router, TypeScript, Prisma ORM, PostgreSQL, and TailwindCSS. The admin dashboard should provide comprehensive management capabilities for all database records, profit margins, pricing, and system analytics.

## **Core Requirements**

### **1. Admin Authentication & Access Control**
- Implement role-based access control (ADMIN role required)
- Protect all admin routes with middleware
- Admin login should redirect to `/admin/dashboard`
- Non-admin users should be redirected to user dashboard

### **2. Admin Layout & Navigation**
- Create a responsive admin layout with sidebar navigation
- Include header with admin info, notifications, and logout
- Sidebar should contain:
  - Dashboard (overview)
  - Users Management
  - Transactions
  - Vendors & Configuration
  - Pricing & Margins
  - Analytics & Reports
  - System Settings
  - Notifications

### **3. Dashboard Overview Page (`/admin/dashboard`)**
- **Key Metrics Cards:**
  - Total Users, Active Users (last 30 days)
  - Total Transactions, Revenue (last 30 days)
  - Total Wallet Balance, Pending Transactions
  - System Health Status
- **Charts & Visualizations:**
  - Transaction volume by service type (Data, Airtime, Bills)
  - Revenue trends (daily/weekly/monthly)
  - User registration growth
  - Top performing networks/services
- **Recent Activity:**
  - Latest transactions with status
  - Recent user registrations
  - System alerts/notifications

### **4. User Management (`/admin/users`)**
- **User List Page:**
  - Paginated table with search/filter
  - Columns: ID, Name, Email, Phone, Balance, Status, Join Date, Last Login
  - Filters: Status (Verified/Unverified), Date Range, Balance Range
  - Actions: View Details, Edit, Suspend/Activate, Reset Password
- **User Detail Page (`/admin/users/[id]`):**
  - User profile information
  - Transaction history
  - Referral information
  - Subscription details
  - Wallet transactions
  - Edit user details (name, email, phone, balance)
- **Bulk Actions:**
  - Export user data to CSV
  - Bulk suspend/activate users

### **5. Transaction Management (`/admin/transactions`)**
- **Transaction List Page:**
  - Comprehensive table with filters
  - Columns: ID, User, Type, Amount, Status, Network, Vendor, Date, Profit
  - Advanced filters: Date range, Status, Type, Network, Vendor, Amount range
  - Search by user email/phone or transaction ID
- **Transaction Detail Page (`/admin/transactions/[id]`):**
  - Complete transaction information
  - Vendor request/response data
  - User information
  - Status timeline
  - Manual status updates (for failed transactions)
- **Transaction Analytics:**
  - Success/failure rates by vendor
  - Average processing time
  - Revenue by service type
- **Bulk Operations:**
  - Export transactions to CSV/Excel
  - Bulk status updates

### **6. Vendor Configuration (`/admin/vendors`)**
- **Vendor List Page:**
  - Table showing all configured vendors
  - Columns: Name, Priority, Status, Supported Services, Health Status, Last Check
  - Enable/disable vendors
  - Set primary vendor per service
- **Vendor Detail Page (`/admin/vendors/[id]`):**
  - Edit vendor credentials (securely)
  - Configure supported services
  - View health check history
  - Test vendor connectivity
- **Vendor Health Monitoring:**
  - Real-time health status
  - Failure count and recovery
  - Automated health checks

### **7. Pricing & Profit Margins (`/admin/pricing`)**
- **Profit Margin Management:**
  - Table of all profit margin rules
  - Columns: Service, Vendor, Network, Margin Type, Value, Status
  - Add/Edit/Delete margin rules
  - Bulk import/export
- **Dynamic Pricing Rules:**
  - Fixed amount margins (e.g., ₦100 for data)
  - Percentage margins (e.g., 5% for airtime)
  - Network-specific rules
  - Amount range rules (min/max thresholds)
- **Pricing Calculator:**
  - Test pricing calculations
  - Preview impact of margin changes

### **8. Analytics & Reports (`/admin/analytics`)**
- **Revenue Analytics:**
  - Total revenue by period
  - Revenue by service type
  - Profit margins analysis
  - Top revenue-generating users
- **User Analytics:**
  - User acquisition and retention
  - Most active users
  - Referral program performance
  - User segmentation
- **Operational Analytics:**
  - Transaction success rates
  - Vendor performance comparison
  - System uptime and performance
  - Error rate monitoring
- **Export Capabilities:**
  - Generate PDF reports
  - Scheduled report delivery
  - Custom date range reports

### **9. System Settings (`/admin/settings`)**
- **General Settings:**
  - Platform name, contact info
  - Default profit margins
  - OTP settings (expiry, resend limits)
  - Referral reward amounts
- **Notification Settings:**
  - Email/SMS templates
  - Admin notification preferences
  - System alert thresholds
- **Security Settings:**
  - Password policies
  - Session timeouts
  - Rate limiting configuration
- **Maintenance Mode:**
  - Enable/disable user access
  - Maintenance messages

### **10. Notification Management (`/admin/notifications`)**
- **System Notifications:**
  - Create broadcast notifications
  - Target specific user groups
  - Schedule notifications
- **User Notifications:**
  - View all user notifications
  - Send targeted notifications
  - Notification delivery status

## **Technical Implementation Details**

### **Database Models to Manage:**
Based on the Prisma schema, create CRUD interfaces for:
- **User**: Full management with role updates
- **Transaction**: Status updates, detailed views
- **VendorConfig**: Configuration management
- **ProfitMargin**: Rule management
- **Pricing**: Legacy pricing (if still used)
- **Subscription**: User subscription management
- **Referral/ReferralEarning**: Referral program oversight
- **Notification**: System notification management
- **OTP**: OTP monitoring (read-only for security)

### **API Routes Structure:**
```
/api/admin/
├── dashboard/          # Overview metrics and charts
├── users/              # User CRUD operations
├── transactions/       # Transaction management
├── vendors/            # Vendor configuration
├── pricing/            # Profit margins and pricing
├── analytics/          # Reporting data
├── settings/           # System configuration
├── notifications/      # Notification management
└── health/             # System health checks
```

### **UI/UX Requirements:**
- **Responsive Design:** Mobile-first approach matching existing app design
- **Data Tables:** Sortable, filterable, paginated tables with search
- **Charts:** Use a charting library (Chart.js or Recharts) for analytics
- **Forms:** Comprehensive forms with validation for all CRUD operations
- **Branding:** Match the existing black/green color scheme
- **Loading States:** Proper loading indicators for all async operations
- **Error Handling:** User-friendly error messages and retry options

### **Security Considerations:**
- All admin routes protected by middleware
- Sensitive data (passwords, API keys) never exposed in frontend
- Audit logging for all admin actions
- CSRF protection on forms
- Rate limiting on admin endpoints

### **Performance Requirements:**
- Efficient database queries with proper indexing
- Pagination for large datasets
- Caching for frequently accessed data
- Lazy loading for heavy components

## **Deliverables**
1. Complete admin dashboard with all specified pages
2. Full CRUD operations for all relevant models
3. Analytics and reporting capabilities
4. Responsive UI matching app branding
5. Secure API routes with proper authentication
6. Comprehensive error handling and loading states
7. Documentation for admin features

## **Integration Points**
- Use existing authentication system (NextAuth)
- Integrate with current database schema
- Maintain consistency with existing API patterns
- Use existing UI components where applicable
- Follow established code organization patterns

Generate all necessary files, components, API routes, and database operations to create a fully functional admin dashboard that provides complete control over the platform's operations, user management, financial tracking, and system monitoring.