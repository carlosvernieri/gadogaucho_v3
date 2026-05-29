-- Criação da função de agregação de mercado para otimização de performance
-- Cole e execute este script na aba "SQL Editor" do seu painel do Supabase.

CREATE OR REPLACE FUNCTION get_market_averages(
  target_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  seven_days_ago TIMESTAMPTZ := target_date - INTERVAL '7 days';
  fourteen_days_ago TIMESTAMPTZ := target_date - INTERVAL '14 days';
  thirty_days_ago TIMESTAMPTZ := target_date - INTERVAL '30 days';
  result JSONB;
BEGIN
  WITH mapped_categories AS (
    SELECT 'Boi Gordo' AS cat, unnest(ARRAY['Boi', 'Novilho', 'Boi Castrado', 'Bois', 'Novilhos', 'Boi Gordo']) AS subcat
    UNION ALL SELECT 'Vaca', unnest(ARRAY['Vaca', 'Vaca com Cria', 'Vaca Prenha', 'Vacas', 'Vacas Prenhes', 'Vacas com Cria', 'Vaca Gorda', 'Vaca Descarte'])
    UNION ALL SELECT 'Novilha', unnest(ARRAY['Novilha', 'Novilhas'])
    UNION ALL SELECT 'Terneiro', unnest(ARRAY['Terneiro', 'Terneiros'])
    UNION ALL SELECT 'Terneira', unnest(ARRAY['Terneira', 'Terneiras'])
  ),
  current_auctions AS (
    SELECT m.cat, AVG(ao.price_kg) as avg_price
    FROM auction_offers ao
    JOIN auctions a ON ao.auction_id = a.id
    JOIN mapped_categories m ON ao.category = m.subcat
    WHERE a.auction_date >= seven_days_ago
    GROUP BY m.cat
  ),
  previous_auctions AS (
    SELECT m.cat, AVG(ao.price_kg) as avg_price
    FROM auction_offers ao
    JOIN auctions a ON ao.auction_id = a.id
    JOIN mapped_categories m ON ao.category = m.subcat
    WHERE a.auction_date >= fourteen_days_ago AND a.auction_date < seven_days_ago
    GROUP BY m.cat
  ),
  platform_offers AS (
    SELECT m.cat, AVG(l.price_kg) as avg_price
    FROM listings l
    JOIN mapped_categories m ON l.category = m.subcat
    WHERE l.created_at >= thirty_days_ago
    GROUP BY m.cat
  )
  SELECT jsonb_object_agg(
    cats.cat,
    jsonb_build_object(
      'auctionAvg', COALESCE(ca.avg_price, 0),
      'prevAuctionAvg', COALESCE(pa.avg_price, 0),
      'platformAvg', COALESCE(po.avg_price, 0)
    )
  ) INTO result
  FROM (SELECT DISTINCT cat FROM mapped_categories) cats
  LEFT JOIN current_auctions ca ON cats.cat = ca.cat
  LEFT JOIN previous_auctions pa ON cats.cat = pa.cat
  LEFT JOIN platform_offers po ON cats.cat = po.cat;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;
