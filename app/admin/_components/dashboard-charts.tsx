'use client'

import { 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

interface RevenueData {
  type: string
  revenue: number
  count: number
  [key: string]: any
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  count: {
    label: "Count",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function RevenueChart({ data }: { data: RevenueData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No revenue data available
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis 
          dataKey="type" 
          axisLine={false} 
          tickLine={false} 
          tickMargin={10}
          className="text-xs fill-muted-foreground"
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tickMargin={10}
          tickFormatter={(value) => `₦${value/1000}k`}
          className="text-xs fill-muted-foreground"
        />
        <ChartTooltip 
          cursor={{ fill: 'hsl(var(--muted))' }}
          content={<ChartTooltipContent 
            formatter={(value) => formatCurrency(Number(value))}
          />} 
        />
        <Bar 
          dataKey="revenue" 
          fill="hsl(var(--chart-1))" 
          radius={[6, 6, 0, 0]} 
        />
      </BarChart>
    </ChartContainer>
  )
}

export function DistributionChart({ data }: { data: RevenueData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No distribution data available
      </div>
    )
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }))

  const pieConfig = chartData.reduce((acc, item) => {
    acc[item.type] = {
      label: item.type,
      color: item.fill,
    }
    return acc
  }, {} as ChartConfig)

  return (
    <ChartContainer config={pieConfig} className="h-[300px] w-full">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={4}
          dataKey="count"
          nameKey="type"
          strokeWidth={2}
          stroke="hsl(var(--background))"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip 
          content={<ChartTooltipContent nameKey="type" />} 
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
      </PieChart>
    </ChartContainer>
  )
}
