'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import MapView from '@/components/MapView'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useApp } from '@/app/providers'
import {
  Search,
  Filter,
  Home,
  Plus,
  Minus,
  RefreshCw,
  Grid3x3,
  Car,
  Building2,
  Settings,
  HelpCircle,
  Sparkles,
  ZoomIn
} from 'lucide-react'

interface Listing {
  listing_id: string
  address?: string
  city?: string
  state?: string
  zip?: string
  price?: number
  latitude?: number
  longitude?: number
  property_type?: string
  beds?: number
  baths?: number
  sqft?: number
  expired?: boolean
  geo_source?: string | null
  owner_email?: string
  enrichment_confidence?: number | null
  primary_photo?: string
  url?: string
}

export default function MapPage() {
  const { profile } = useApp()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('Pasadena')
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(['Good For Wholesaling'])

  useEffect(() => {
    if (profile?.id) {
      fetchListings()
    }
  }, [profile?.id])

  const fetchListings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .limit(1000)
        .order('created_at', { ascending: false })

      if (error) throw error
      setListings(data || [])
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Convert listings to leads format for MapView
  const leads = useMemo(() => {
    return listings.map(listing => ({
      id: listing.listing_id,
      address: listing.address || '',
      city: listing.city || '',
      state: listing.state || '',
      zip: listing.zip || '',
      price: listing.price || 0,
      price_drop_percent: 0,
      days_on_market: 0,
      url: listing.url || '',
      latitude: listing.latitude,
      longitude: listing.longitude,
      property_type: listing.property_type,
      beds: listing.beds,
      sqft: listing.sqft,
      expired: listing.expired,
      geo_source: listing.geo_source,
      owner_email: listing.owner_email,
      enrichment_confidence: listing.enrichment_confidence,
      primary_photo: listing.primary_photo
    }))
  }, [listings])

  const propertyTypeOptions = [
    'Distressed Properties',
    'Good For Wholesaling',
    'Corner Lots',
    'Bad Roofs',
    'Solar-Ready'
  ]

  const togglePropertyType = (type: string) => {
    setSelectedPropertyTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] bg-white dark:bg-gray-900">
        {/* Top Section - Search and Filters */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for an address, zip code, city or county"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Quick Filters
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Property Type
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                $ Price
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Beds & Baths
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                More
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Clear All
              </button>
            </div>

            {/* Location */}
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {location}
            </div>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Sort By:</label>
            <select className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Sale Date (Newest)</option>
              <option>Price (Low to High)</option>
              <option>Price (High to Low)</option>
              <option>Days on Market</option>
            </select>
          </div>
        </div>

        {/* Main Content Area - Map and Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map Section */}
          <div className="flex-1 relative">
            {/* Map Controls - Left Sidebar */}
            <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
              <button className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg flex items-center justify-center transition-colors">
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg flex items-center justify-center transition-colors">
                <Car className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg flex items-center justify-center transition-colors">
                <Building2 className="w-5 h-5" />
              </button>
            </div>

            {/* Map Controls - Top Center */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <button
                onClick={fetchListings}
                className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Map
              </button>
            </div>

            {/* Map Controls - Right Sidebar */}
            <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
              <button className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg flex items-center justify-center transition-colors">
                <Home className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors">
                <Minus className="w-5 h-5" />
              </button>
            </div>

            {/* Map Component */}
            <div className="w-full h-full">
              <MapView
                isActive={true}
                listings={leads}
                loading={loading}
              />
            </div>

            {/* Map Legend - Bottom Center */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-2">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Lead</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Property</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-2 bg-orange-500 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Highlight Map</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gray-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Route</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Results */}
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="flex-1 overflow-auto p-6">
              {leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    There are no properties to display. Try reloading the map, changing your filters/location, or zooming into a smaller area.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leads.slice(0, 20).map((lead) => (
                    <div
                      key={lead.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    >
                      {lead.primary_photo && (
                        <img
                          src={lead.primary_photo}
                          alt={lead.address}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {lead.address || 'Address not available'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {lead.city}, {lead.state} {lead.zip}
                      </p>
                      {lead.price && (
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          ${lead.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section - Property Type Filters */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Zoom in more to load properties and build a list in an area, or search for a location.
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              What kind of properties are you looking for?
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {propertyTypeOptions.map((type) => (
              <button
                key={type}
                onClick={() => togglePropertyType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedPropertyTypes.includes(type)
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type}
              </button>
            ))}
            <a
              href="#"
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
            >
              Build With AI Vision
              <div className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                <Settings className="w-4 h-4" />
                <HelpCircle className="w-4 h-4" />
              </div>
            </a>
            <select className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Back To Basic Builder</option>
            </select>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
