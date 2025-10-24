import { PublicNavigation } from '../components'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PublicNavigation />
      {children}
    </>
  )
}
