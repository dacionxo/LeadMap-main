'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

interface Lead {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  price_drop_percent: number;
  days_on_market: number;
  url: string;
  latitude?: number;
  longitude?: number;
  property_type?: string;
  beds?: number;
  sqft?: number;
  year_built?: number;
  description?: string;
  agent_name?: string;
  agent_email?: string;
  primary_photo?: string;
  expired?: boolean;
  geo_source?: string | null;
  owner_email?: string;
  enrichment_confidence?: number | null;
}

interface GoogleMapsViewProps {
  isActive: boolean;
  listings: Lead[];
  loading: boolean;
}

const MapComponent: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);

  // Function to get marker color based on lead type
  const getMarkerColor = (lead: Lead) => {
    if (lead.expired) return '#ef4444'; // Red for expired leads
    if (lead.geo_source) return '#3b82f6'; // Blue for geo-sourced leads
    if (lead.owner_email || (lead.enrichment_confidence && lead.enrichment_confidence > 0)) return '#10b981'; // Green for enriched leads
    return '#8b5cf6'; // Purple for default/probate leads
  };

  // Function to get marker icon
  const getMarkerIcon = (lead: Lead) => {
    const color = getMarkerColor(lead);
    const symbol = lead.expired ? '!' : 
                   lead.geo_source ? '📍' : 
                   (lead.owner_email || lead.enrichment_confidence) ? '✓' : '🏠';
    
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${symbol}</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16)
    };
  };

  useEffect(() => {
    if (!mapRef.current || map) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: 28.5383, lng: -81.3792 }, // Orlando, FL center
      zoom: 10,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    setMap(mapInstance);
    
    // Create a single info window instance
    const infoWindowInstance = new google.maps.InfoWindow();
    setInfoWindow(infoWindowInstance);
    
    // Close info window when clicking on the map
    mapInstance.addListener('click', () => {
      infoWindowInstance.close();
    });
  }, []);

  useEffect(() => {
    console.log('MapComponent: leads received:', leads.length, leads);
    if (!map || !leads.length) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    const newMarkers: google.maps.Marker[] = [];

    leads.forEach((lead) => {
      if (lead.latitude && lead.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: lead.latitude, lng: lead.longitude },
          map: map,
          title: `${lead.address}, ${lead.city}, ${lead.state}`,
          icon: getMarkerIcon(lead)
        });

        marker.addListener('click', () => {
          // Close any existing info window
          if (infoWindow) {
            infoWindow.close();
          }
          
          // Set content and open new info window
          if (infoWindow) {
            infoWindow.setContent(`
              <div style="padding: 8px; max-width: 300px;">
                <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">
                  ${lead.address}
                </h3>
                <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">
                  ${lead.city}, ${lead.state} ${lead.zip}
                </p>
                <div style="display: flex; gap: 12px; margin: 8px 0;">
                  <div>
                    <span style="color: #059669; font-weight: bold; font-size: 18px;">
                      $${lead.price.toLocaleString()}
                    </span>
                    ${lead.price_drop_percent > 0 ? `
                      <span style="color: #dc2626; font-size: 14px; margin-left: 4px;">
                        (${lead.price_drop_percent}% off)
                      </span>
                    ` : ''}
                  </div>
                </div>
                <div style="display: flex; gap: 12px; margin: 8px 0; font-size: 14px; color: #6b7280;">
                  ${lead.beds ? `<span>${lead.beds} bed${lead.beds !== 1 ? 's' : ''}</span>` : ''}
                  ${lead.sqft ? `<span>${lead.sqft.toLocaleString()} sqft</span>` : ''}
                  ${lead.year_built ? `<span>Built ${lead.year_built}</span>` : ''}
                </div>
                ${lead.days_on_market > 0 ? `
                  <p style="margin: 4px 0 0 0; color: #f59e0b; font-size: 14px;">
                    ${lead.days_on_market} days on market
                  </p>
                ` : ''}
                ${lead.description ? `
                  <p style="margin: 8px 0 0 0; color: #374151; font-size: 13px; line-height: 1.4;">
                    ${lead.description.substring(0, 150)}${lead.description.length > 150 ? '...' : ''}
                  </p>
                ` : ''}
                <div style="margin-top: 12px;">
                  <a href="${lead.url}" target="_blank" rel="noopener noreferrer" 
                     style="display: inline-block; background: #3b82f6; color: white; 
                            padding: 6px 12px; border-radius: 4px; text-decoration: none; 
                            font-size: 14px; font-weight: 500;">
                    View Property
                  </a>
                </div>
              </div>
            `);
            infoWindow.open(map, marker);
          }
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      map.fitBounds(bounds);
    }
  }, [map, leads]);

  return <div ref={mapRef} style={{ width: '100%', height: '600px' }} />;
};

const render = (status: Status): React.ReactElement => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Google Maps...</p>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Map Failed to Load</h3>
            <p className="text-red-600">Please check your Google Maps API key and try again.</p>
          </div>
        </div>
      );
    default:
      return <div></div>;
  }
};

const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({ isActive, listings, loading }) => {

  if (!isActive) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Switch to Map view to see leads</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 rounded-lg">
        <div className="text-center">
          <div className="text-yellow-600 text-6xl mb-4">🔑</div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Google Maps API Key Required</h3>
          <p className="text-yellow-600 mb-4">
            Please add your Google Maps API key to the environment variables.
          </p>
          <div className="bg-yellow-100 p-4 rounded-lg text-left text-sm">
            <p className="font-semibold mb-2">Add to your .env.local file:</p>
            <code className="block bg-white p-2 rounded border">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Property Map</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {listings.length} propert{listings.length !== 1 ? 'ies' : 'y'} found
          </span>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Expired</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Geo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Enriched</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Default</span>
            </div>
          </div>
        </div>
      </div>
      
      <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render}>
        <MapComponent leads={listings} />
      </Wrapper>
    </div>
  );
};

export default GoogleMapsView;