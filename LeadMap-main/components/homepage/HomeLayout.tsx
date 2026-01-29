'use client'

import { AnnouncementBar } from './layout/AnnouncementBar'
import Header from './layout/Header'
import { CustomFooter } from './layout/CustomFooter'

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="frontend-page">
      <AnnouncementBar />
      <Header />
      <main>{children}</main>
      <CustomFooter />
    </div>
  )
}
