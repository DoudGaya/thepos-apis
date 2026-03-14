'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FixedRulesTab } from './_components/fixed-rules-tab'
import { PassiveGroupsTab } from './_components/passive-groups-tab'
import { EarningsTab } from './_components/earnings-tab'
import { WithdrawalsTab } from './_components/withdrawals-tab'

export default function ReferralsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold tracking-tight">Referral Commission System</h1>
      </div>
      
      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="fixed">Fixed Rules</TabsTrigger>
          <TabsTrigger value="passive">Passive Groups</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <EarningsTab />
        </TabsContent>

        <TabsContent value="fixed" className="space-y-4">
           <FixedRulesTab />
        </TabsContent>

        <TabsContent value="passive" className="space-y-4">
           <PassiveGroupsTab />
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
           <WithdrawalsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
