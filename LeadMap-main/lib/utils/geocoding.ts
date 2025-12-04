/**
 * Geocoding utility functions for Google Maps
 * Converts addresses to coordinates and vice versa
 */

declare global {
  interface Window {
    google?: {
      maps: typeof google.maps;
    };
  }
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

/**
 * Geocode an address to get coordinates
 * @param address - Full address string (e.g., "123 Main St, City, State ZIP")
 * @returns Promise with coordinates and formatted address
 */
export function geocodeAddress(address: string): Promise<GeocodeResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google?.maps) {
      reject(new Error('Google Maps API not loaded'));
      return;
    }

    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng(),
          formattedAddress: results[0].formatted_address
        });
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Reverse geocode coordinates to get an address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise with formatted address
 */
export function reverseGeocode(lat: number, lng: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google?.maps) {
      reject(new Error('Google Maps API not loaded'));
      return;
    }

    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Build address string from listing data
 * @param listing - Listing object with address fields
 * @returns Formatted address string
 */
export function buildAddressString(listing: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  unit?: string | null;
}): string {
  const parts: string[] = [];
  
  if (listing.street) {
    parts.push(listing.street);
  }
  if (listing.unit) {
    parts.push(listing.unit);
  }
  if (listing.city) {
    parts.push(listing.city);
  }
  if (listing.state) {
    parts.push(listing.state);
  }
  if (listing.zip_code) {
    parts.push(listing.zip_code);
  }
  
  return parts.join(', ');
}

