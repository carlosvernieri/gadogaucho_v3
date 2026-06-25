-- ==============================================================================
-- ADICIONA NOVOS CAMPOS PARA LIMITES DE PREÇO E PESO NOS ALERTAS
-- ==============================================================================

ALTER TABLE public.opportunity_alerts ADD COLUMN IF NOT EXISTS min_price NUMERIC;
ALTER TABLE public.opportunity_alerts ADD COLUMN IF NOT EXISTS max_price NUMERIC;
ALTER TABLE public.opportunity_alerts ADD COLUMN IF NOT EXISTS min_weight NUMERIC;
ALTER TABLE public.opportunity_alerts ADD COLUMN IF NOT EXISTS max_weight NUMERIC;
