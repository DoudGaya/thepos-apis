"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Wallet,
  Smartphone,
  Wifi,
  Receipt,
  Users,
  CreditCard,
  User,
  LogOut,
  Settings,
  Bell,
} from "lucide-react"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Wallet",
    url: "/dashboard/wallet",
    icon: Wallet,
  },
  {
    title: "Buy Airtime",
    url: "/dashboard/airtime",
    icon: Smartphone,
  },
  {
    title: "Buy Data",
    url: "/dashboard/data",
    icon: Wifi,
  },
  {
    title: "Utility Bills",
    url: "/dashboard/bills",
    icon: Receipt,
    items: [
      {
        title: "Electricity",
        url: "/dashboard/electricity",
      },
      {
        title: "Cable TV",
        url: "/dashboard/cable-tv",
      },
      {
        title: "Betting Wallet",
        url: "/dashboard/betting",
      },
      {
        title: "ePins",
        url: "/dashboard/epins",
      },
    ],
  },
  {
    title: "Transactions",
    url: "/dashboard/transactions",
    icon: CreditCard,
  },
  {
    title: "Referrals",
    url: "/dashboard/referrals",
    icon: Users,
  },
]

const navSecondary = [
  {
    title: "Notifications",
    url: "/dashboard/notifications",
    icon: Bell,
  },
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: User,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()

  const userData = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: "/avatars/user.jpg", // Placeholder or use session image if available
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="relative aspect-square size-8 items-center justify-center rounded-lg bg-black text-sidebar-primary-foreground flex overflow-hidden">
                  <Image src="/assets/nillarpay-white.png" alt="N" width={20} height={20} className="object-contain" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">NillarPay</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
