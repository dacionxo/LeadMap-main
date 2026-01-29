'use client'

import Image from 'next/image'
import Link from 'next/link'

const FullLogo = () => {
  return (
    <Link href="/">
      <Image
        src="/images/logos/nextdeal-logo.png"
        alt="NextDeal"
        width={204}
        height={36}
        className="h-9 w-auto rtl:scale-x-[-1]"
      />
    </Link>
  )
}

export default FullLogo
