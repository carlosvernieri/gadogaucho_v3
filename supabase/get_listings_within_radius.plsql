DROP FUNCTION IF EXISTS get_listings_within_radius(FLOAT, FLOAT, FLOAT, TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION get_listings_within_radius(
  target_lat FLOAT, 
  target_lng FLOAT, 
  max_distance_km FLOAT, 
  category_filter TEXT DEFAULT NULL, 
  search_filter TEXT DEFAULT NULL, 
  offset_val INT DEFAULT 0, 
  limit_val INT DEFAULT 20 )

RETURNS TABLE ( 
  id BIGINT, 
  created_at TIMESTAMPTZ, 
  category TEXT, 
  title TEXT, 
  price NUMERIC, 
  price_kg NUMERIC, 
  avg_weight NUMERIC, 
  quantity INT, 
  location TEXT, 
  lat FLOAT, 
  lng FLOAT, 
  user_id TEXT, 
  image TEXT, 
  description TEXT, 
  images JSONB, 
  videos JSONB, 
  sold BOOLEAN, 
  verified BOOLEAN, 
  verification_requested BOOLEAN, 
  seller_name TEXT, 
  seller_verified BOOLEAN, 
  distance_km FLOAT )

LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.created_at,
    l.category,
    l.title,
    l.price,
    l.price_kg,
    l.avg_weight,
    l.quantity,
    l.location,
    l.lat,
    l.lng,
    l.user_id,
    l.image,
    l.description,
    l.images,
    l.videos,
    l.sold,
    l.verified,
    l.verification_requested,
    u.name AS seller_name,
    u.verified AS seller_verified,
    (6371 * acos(
      LEAST(1, GREATEST(
        cos(radians(target_lat)) * cos(radians(l.lat)) *
        cos(radians(l.lng) - radians(target_lng)) +
        sin(radians(target_lat)) * sin(radians(l.lat)),
      -1))
    )) AS distance_km
  FROM listings l
  LEFT JOIN users u
    ON l.user_id = u.id
  WHERE
    (l.sold = FALSE OR l.sold IS NULL)
    AND (category_filter IS NULL OR l.category ILIKE category_filter)
    AND (
      search_filter IS NULL OR
      l.title ILIKE '%' || search_filter || '%' OR
      l.id::TEXT = search_filter
    )
    AND (
      6371 * acos(
        LEAST(1, GREATEST(
          cos(radians(target_lat)) * cos(radians(l.lat)) *
          cos(radians(l.lng) - radians(target_lng)) +
          sin(radians(target_lat)) * sin(radians(l.lat)),
        -1))
      ) <= max_distance_km
    )
  ORDER BY l.id DESC
  OFFSET offset_val
  LIMIT limit_val;
END;
$$;