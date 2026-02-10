"use client";

import { useCallback } from "react";
import { GeocodeResult, useMapGeocodeSearch } from "./MapGeocodeSearch";
import MapSearchBar from "./MapSearchBar";

interface MapRouteGeocodeSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  onResult: (result: GeocodeResult) => void;
  placeholder?: string;
}

/**
 * Route-backed search wrapper for /dashboard/map.
 * Keeps the existing search bar UI unchanged while wiring geocode behavior.
 */
export default function MapRouteGeocodeSearch({
  value,
  onValueChange,
  onResult,
  placeholder = "Search by City, Zip, or Address",
}: MapRouteGeocodeSearchProps) {
  const handleResult = useCallback(
    (result: GeocodeResult) => {
      onResult(result);
      if (result.formattedAddress) {
        onValueChange(result.formattedAddress);
      }
    },
    [onResult, onValueChange]
  );

  const { search, isSearching, error, clearError } = useMapGeocodeSearch({
    onResult: handleResult,
  });

  return (
    <>
      <MapSearchBar
        searchValue={value}
        onSearchChange={(next) => {
          onValueChange(next);
          clearError();
        }}
        onSearchSubmit={search}
        placeholder={placeholder}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center px-2">
          {error}
        </p>
      )}
      {isSearching && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center px-2">
          Finding location...
        </p>
      )}
    </>
  );
}
