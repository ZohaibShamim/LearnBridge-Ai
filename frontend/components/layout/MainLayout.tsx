'use client'

import Sidebar from '@/components/sidebar/Sidebar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-20 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}