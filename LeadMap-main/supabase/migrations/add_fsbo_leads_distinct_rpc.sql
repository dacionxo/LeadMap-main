-- ============================================================================
-- RPC: Get distinct values for a single column from fsbo_leads (for dynamic
-- filter options on property listing pagination screens).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_fsbo_leads_distinct(p_column_name text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text[];
  allowed_columns text[] := ARRAY[
    'living_area', 'year_built_pagination', 'bedrooms', 'bathrooms',
    'property_type', 'construction_type', 'building_style', 'effective_year_built',
    'number_of_units', 'stories', 'garage', 'heating_type', 'heating_gas',
    'air_conditioning', 'basement', 'deck', 'interior_walls', 'exterior_walls',
    'fireplaces', 'flooring_cover', 'driveway', 'pool', 'patio', 'porch',
    'roof', 'sewer', 'water', 'apn', 'lot_size', 'legal_name', 'legal_description',
    'property_class', 'county_name', 'elementary_school_district', 'high_school_district',
    'zoning', 'flood_zone', 'tax_year', 'tax_amount', 'assessment_year',
    'total_assessed_value', 'assessed_improvement_value', 'total_market_value', 'amenities'
  ];
BEGIN
  IF p_column_name IS NULL OR NOT (p_column_name = ANY(allowed_columns)) THEN
    RETURN ARRAY[]::text[];
  END IF;
  EXECUTE format(
    'SELECT COALESCE(array_agg(v ORDER BY v), ARRAY[]::text[]) FROM (
      SELECT DISTINCT trim(%I::text) AS v FROM public.fsbo_leads
      WHERE %I IS NOT NULL AND trim(%I::text) <> ''
      LIMIT 5000
    ) sub',
    p_column_name, p_column_name, p_column_name
  ) INTO result;
  RETURN COALESCE(result, ARRAY[]::text[]);
END;
$$;

COMMENT ON FUNCTION public.get_fsbo_leads_distinct(text) IS 'Returns distinct non-null values for a given fsbo_leads column (for dynamic filter options).';
