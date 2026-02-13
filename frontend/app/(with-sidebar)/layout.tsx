import MainLayout from '@/components/layout/MainLayout'

export default function WithSidebarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}