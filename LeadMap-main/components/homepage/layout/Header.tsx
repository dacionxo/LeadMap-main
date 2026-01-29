'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import FullLogo from '@/components/auth/FullLogo'
import { Sheet, SheetContent, SheetTrigger } from '@/app/components/ui/sheet'
import { Menu } from 'lucide-react'

const Header = () => {
  const [isSticky, setIsSticky] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const Links = [
    { key: 'link1', title: 'Dashboard', link: '/dashboard' },
    { key: 'link2', title: 'Pricing', link: '/pricing' },
    { key: 'link3', title: 'Contact', link: '/contact' },
    { key: 'link4', title: 'Demo', link: '/demo' },
  ]

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        isSticky ? 'bg-white dark:bg-gray-900 shadow-md' : 'bg-lightprimary dark:bg-lightprimary'
      }`}
    >
      <div className="flex items-center justify-between px-4 lg:px-6 py-6 container">
        <FullLogo />

        {/* Mobile menu button */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-4">
            <div className="flex flex-col gap-4 mt-8">
              {Links.map((item) => (
                <Link
                  key={item.key}
                  href={item.link}
                  onClick={() => setMobileOpen(false)}
                  className={`text-[15px] py-2.5 px-4 rounded-md ${
                    pathname === item.link
                      ? 'text-primary bg-lightprimary dark:text-primary'
                      : 'text-link dark:text-darklink font-medium'
                  }`}
                >
                  {item.title}
                </Link>
              ))}
              <Button className="mt-4 w-full" asChild>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {Links.map((item) => (
            <Link
              key={item.key}
              href={item.link}
              className={`px-3 py-2 text-[15px] font-medium rounded-md transition ${
                pathname === item.link
                  ? 'text-primary bg-lightprimary dark:text-primary'
                  : 'text-link dark:text-darklink hover:text-primary dark:hover:text-primary'
              }`}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <Button asChild className="hidden lg:inline-flex">
          <Link href="/login">Login</Link>
        </Button>
      </div>
    </header>
  )
}

export default Header
