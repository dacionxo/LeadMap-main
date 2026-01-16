'use client'

import { Icon } from '@iconify/react'
import Link from 'next/link'

const AppLinks = () => {
  const quickLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: 'solar:widget-2-linear' },
    { href: '/dashboard/map', label: 'Maps', icon: 'solar:map-point-linear' },
    { href: '/dashboard/prospect-enrich', label: 'Enrichment', icon: 'solar:user-id-bold-duotone' },
  ]

  return (
    <div className="relative group">
      {/* Desktop trigger */}
      <button className="text-sm text-link dark:text-darklink dark:hover:text-primary px-4 h-10 hover:text-primary flex items-center justify-center cursor-pointer xl:flex hidden">
        <span>Apps</span>
        <Icon icon="tabler:chevron-down" height={15} className="shrink-0 ml-1" />
      </button>

      {/* Mobile Trigger */}
      <span className="xl:hidden text-link dark:text-darklink flex rounded-full px-[15px] pb-0.5 justify-center items-center cursor-pointer group-hover:text-primary">
        <Icon icon="tabler:apps" className="shrink-0" height={20} />
      </span>

      {/* Desktop Dropdown */}
      <div className="sm:w-[900px] z-40 w-screen dropdown top-[28px] xl:invisible xl:group-hover:visible visible absolute">
        <div className="xl:relative xl:translate-none xl:h-auto xl:bg-transparent xl:z-[0] xl:w-[900px] hidden xl:block">
          <div className="md:h-auto h-[calc(100vh_-_50px)] bg-white dark:bg-dark shadow-md dark:shadow-dark-md rounded-sm overflow-auto">
            <div className="grid grid-cols-12 w-full">
              <div className="xl:col-span-8 col-span-12 flex items-stretch xl:pr-0 px-5 py-5">
                <div className="grid grid-cols-12 gap-3 w-full">
                  {quickLinks.map((link, index) => (
                    <div
                      className="col-span-12 xl:col-span-6 flex items-stretch"
                      key={index}
                    >
                      <ul>
                        <li>
                          <Link
                            href={link.href}
                            className="flex gap-3 items-center hover:text-primary group relative"
                          >
                            <span className="bg-lightprimary h-10 w-10 flex justify-center items-center rounded-md">
                              <Icon icon={link.icon} className="h-5 w-5 text-primary" />
                            </span>
                            <div>
                              <h6 className="font-semibold text-sm text-ld hover:text-primary mb-1">
                                {link.label}
                              </h6>
                              <p className="text-xs text-link dark:text-darklink opacity-90 font-medium">
                                {link.href}
                              </p>
                            </div>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              <div className="xl:col-span-4 col-span-12 flex items-stretch px-5 pb-5">
                {/* Quick links section */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppLinks
