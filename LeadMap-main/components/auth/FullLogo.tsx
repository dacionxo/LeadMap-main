'use client'

import Image from 'next/image'
import Link from 'next/link'

const FullLogo = () => {
  return (
    <Link href="/">
      <Image
        src="/images/logos/nextdeal-logo.png"
        alt="NextDeal"
        width={240}
        height={42}
        className="h-10 w-auto rtl:scale-x-[-1]"
      />
    </Link>
  )
}

export default FullLogo
