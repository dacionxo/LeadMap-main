'use client'

import { useEffect, useState } from 'react'

interface CountUpProps {
  from?: number
  to: number
  duration?: number
  className?: string
  formatWithCommas?: boolean
}

export default function CountUp({
  from = 0,
  to,
  duration = 2,
  className,
  formatWithCommas = true,
}: CountUpProps) {
  const [display, setDisplay] = useState(
    formatWithCommas ? from.toLocaleString() : from.toString(),
  )

  useEffect(() => {
    let startTime: number | null = null
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const elapsed = (currentTime - startTime) / 1000 // Convert to seconds
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease out function
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * easeOut
      
      setDisplay(
        formatWithCommas 
          ? Math.floor(current).toLocaleString() 
          : Math.floor(current).toString()
      )

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [from, to, duration, formatWithCommas])

  return <span className={className}>{display}</span>
}
