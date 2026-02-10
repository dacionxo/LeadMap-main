"use client";

import { useCallback, useState } from "react";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

/**
 * Hook to call the geocode API and pass results to a callback.
 * Use with MapSearchBar's onSearchSubmit - does not change the search bar UI.
 */
export function useMapGeocodeSearch({
  onResult,
  onError,
}: {
  onResult: (result: GeocodeResult) => void;
  onError?: (message: string) => void;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      setError(null);
      setIsSearching(true);

      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(trimmed)}`,
          { credentials: "include" }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg =
            typeof data?.error === "string"
              ? data.error
              : "Could not find that location";
          setError(msg);
          onError?.(msg);
          return;
        }

        const lat =
          typeof data.lat === "number" ? data.lat : Number(data.lat);
        const lng =
          typeof data.lng === "number" ? data.lng : Number(data.lng);

        if (
          Number.isNaN(lat) ||
          Number.isNaN(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          const msg = "Invalid location returned.";
          setError(msg);
          onError?.(msg);
          return;
        }

        onResult({
          lat,
          lng,
          formattedAddress: data.formattedAddress,
        });
      } catch {
        const msg = "Search failed. Please try again.";
        setError(msg);
        onError?.(msg);
      } finally {
        setIsSearching(false);
      }
    },
    [onResult, onError]
  );

  const clearError = useCallback(() => setError(null), []);

  return { search, isSearching, error, clearError };
}
