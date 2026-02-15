'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FixedRulesTab } from './_components/fixed-rules-tab'
import { PassiveGroupsTab } from './_components/passive-groups-tab'

export default function ReferralsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold tracking-tight">Referral Commission System</h1>
      </div>
      
      <Tabs defaultValue="fixed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fixed">Fixed Referrals</TabsTrigger>
          <TabsTrigger value="passive">Passive Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="space-y-4">
           <FixedRulesTab />
        </TabsContent>

        <TabsContent value="passive" className="space-y-4">
           <PassiveGroupsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
