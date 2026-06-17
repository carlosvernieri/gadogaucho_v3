-- ==============================================================================
-- REGRAS DE RLS DO SUPABASE STORAGE PARA O BUCKET 'gado_gaucho_media'
-- ==============================================================================

-- 1. Garante que o bucket exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('gado_gaucho_media', 'gado_gaucho_media', true)
ON CONFLICT (id) DO NOTHING;

-- Habilita segurança de RLS na tabela de objetos de storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Owner Delete" ON storage.objects;

-- 2. Qualquer pessoa (incluindo usuários anônimos) pode visualizar/baixar mídias
CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'gado_gaucho_media');

-- 3. Apenas usuários autenticados podem enviar arquivos (Upload)
CREATE POLICY "Authenticated Insert Access" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gado_gaucho_media');

-- 4. Apenas o proprietário do arquivo (ou administradores) pode atualizar ou substituir arquivos
CREATE POLICY "Authenticated Owner Update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'gado_gaucho_media' AND (
      auth.uid()::text = owner OR
      (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
    )
  );

-- 5. Apenas o proprietário do arquivo (ou administradores) pode deletar arquivos
CREATE POLICY "Authenticated Owner Delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'gado_gaucho_media' AND (
      auth.uid()::text = owner OR
      (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
    )
  );
