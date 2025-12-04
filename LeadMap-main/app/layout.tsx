import type { Metadata } from 'next'
import { Inter, Montserrat, Lato } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import AdvancedChatButton from '@/components/AdvancedChatButton'
import { ThemeProvider } from '@/components/ThemeProvider'
import GlobalListSelector from './components/GlobalListSelector'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const lato = Lato({ 
  subsets: ['latin'],
  variable: '--font-lato',
  display: 'swap',
  weight: ['400', '700'], // Note: Lato doesn't have weight 500, using 400 with font-weight: 500 will use browser fallback
})

export const metadata: Metadata = {
  title: 'NextDeal - Real Estate Lead Generation',
  description: 'Find undervalued property leads with our subscription-based platform for real estate agents and brokers.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCZ0i53LQCnvju3gZYXW5ZQe_IfgWBDM9M'
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${montserrat.variable} ${lato.variable} ${inter.className}`}>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,geometry&loading=async`}
          strategy="lazyOnload"
          onLoad={() => {
            // Initialize Google Maps when script loads
            if (typeof window !== 'undefined') {
              (window as any).initMap = (window as any).initMap || (() => {
                console.log('Google Maps API loaded successfully')
              })
            }
          }}
          onError={(e) => {
            console.error('Failed to load Google Maps API:', e)
          }}
        />
        <ThemeProvider>
          <Providers>
            {children}
            <AdvancedChatButton />
            <GlobalListSelector />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
