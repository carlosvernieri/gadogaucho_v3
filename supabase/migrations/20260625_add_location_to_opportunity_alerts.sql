-- ==============================================================================
-- ADICIONA LOCALIZAÇÃO AOS ALERTAS E DISTÂNCIA MÁXIMA NAS CONFIGURAÇÕES
-- ==============================================================================

ALTER TABLE public.opportunity_alerts ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.opportunity_alerts ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.opportunity_alerts ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Se o registro alert_settings não existir, cria com os padrões. Se existir, garante a presença do max_distance
INSERT INTO public.system_settings (key, value)
VALUES ('alert_settings', '{"paused": false, "max_distance": 100}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = public.system_settings.value || '{"max_distance": 100}'::jsonb;
