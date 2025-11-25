'use client'

import { ReactNode, useEffect, useState, Suspense } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { SidebarProvider, useSidebar } from './SidebarContext'

interface DashboardLayoutProps {
  children: ReactNode
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const [mounted, setMounted] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number }>>([])
  const { isOpen } = useSidebar()

  useEffect(() => {
    setMounted(true)
    
    // Generate particles for animated background
    const particleCount = 50
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 3 + 3
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="particles">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <Suspense fallback={<div className="w-64" />}>
        <Sidebar />
      </Suspense>
      <main className={`flex-1 overflow-y-auto relative z-10 bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-300 ${
        isOpen ? 'ml-64' : 'ml-16'
      }`}>
        <Header />
        {/* Main Content */}
        <div className="relative z-10 p-6 lg:p-8">
          {mounted && children}
        </div>
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  )
}
