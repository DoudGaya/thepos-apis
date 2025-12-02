import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import VendorForm from '../_components/vendor-form'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function VendorEditPage({ params }: PageProps) {
  const { id } = await params
  const vendor = await prisma.vendorConfig.findUnique({
    where: { id }
  })

  if (!vendor) {
    notFound()
  }

  return <VendorForm vendor={vendor} />
}
