import GlobalNavbar from '../components/GlobalNavbar'
import GlobalFooter from '../components/GlobalFooter'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <GlobalNavbar />
      <main className="flex-grow">
        {children}
      </main>
      <GlobalFooter />
    </div>
  )
}
