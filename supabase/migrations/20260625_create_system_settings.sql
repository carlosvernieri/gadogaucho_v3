-- ==============================================================================
-- CRIAÇÃO DA TABELA DE CONFIGURAÇÕES DO SISTEMA (COMPATÍVEL COM VERCEL)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir valor padrão para alertas e banner de abertura
INSERT INTO public.system_settings (key, value)
VALUES 
  ('alert_settings', '{"paused": false, "max_distance": 100}'::jsonb),
  ('alert_banner_settings', '{"enabled": true, "title": "Encontre o Lote Perfeito com Alertas de Oportunidades!", "description": "Não perca tempo procurando! Cadastre a categoria, peso e preço desejados. Avisamos você por e-mail assim que um lote correspondente for anunciado.", "buttonText": "Ativar Alerta de Oportunidade"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Permissões de RLS:
-- 1. Qualquer pessoa (incluindo o Dispatcher e o frontend) pode ler as configurações
DROP POLICY IF EXISTS "system_settings_select_policy" ON public.system_settings;
CREATE POLICY "system_settings_select_policy" ON public.system_settings
  FOR SELECT USING (true);

-- 2. Apenas administradores podem atualizar as configurações
DROP POLICY IF EXISTS "system_settings_write_policy" ON public.system_settings;
CREATE POLICY "system_settings_write_policy" ON public.system_settings
  FOR ALL USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );
