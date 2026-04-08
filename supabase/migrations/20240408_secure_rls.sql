-- ==============================================================================
-- REGRAS DE RLS SUPER SEGURAS PARA O GADO GAÚCHO
-- ==============================================================================
-- O sistema atual não usa a autenticação nativa do Supabase (Supabase Auth). 
-- Em vez disso, o frontend se comunica com a pasta `/app/api/` e os métodos 
-- da API utilizam a chave `supabaseAdmin` (Service Role Key). 
-- 
-- Isso é uma excelente notícia de segurança, pois a Service Role key ignora o RLS. 
-- Dessa forma, podemos **fechar 100% o acesso público do banco de dados (Anon)** 
-- deletando as regras permissivas. Tudo continuará funcionando pela API interna!

-- 1. Remove políticas públicas inseguras das tabelas
DROP POLICY IF EXISTS "Allow public read access on listings" ON listings;
DROP POLICY IF EXISTS "Allow public insert on listings" ON listings;
DROP POLICY IF EXISTS "Allow public update on listings" ON listings;
DROP POLICY IF EXISTS "Allow public delete on listings" ON listings;

DROP POLICY IF EXISTS "Allow public read access on users" ON users;
DROP POLICY IF EXISTS "Allow public insert on users" ON users;
DROP POLICY IF EXISTS "Allow users to update their own data" ON users;
DROP POLICY IF EXISTS "Allow public delete on users" ON users;

DROP POLICY IF EXISTS "Allow public read access on favorites" ON favorites;
DROP POLICY IF EXISTS "Allow public insert on favorites" ON favorites;
DROP POLICY IF EXISTS "Allow public delete on favorites" ON favorites;

DROP POLICY IF EXISTS "Allow public read access on messages" ON messages;
DROP POLICY IF EXISTS "Allow public insert on messages" ON messages;
DROP POLICY IF EXISTS "Allow public update on messages" ON messages;
DROP POLICY IF EXISTS "Allow public delete on messages" ON messages;

-- Ao não haver políticas associadas, o RLS bloqueia todo mundo com Anon Key.

-- ==============================================================================
-- REGRAS DO STORAGE BUCKET (SE AINDA NÃO EXISTIREM)
-- ==============================================================================
-- Como o envio de mídias ainda é feito diretamente do frontend para o Storage
-- (você usa `supabase.storage.from` nos componentes react), criamos regras
-- no módulo de objetos do supabase (storage.objects).

-- Permite que o público em geral veja as imagens e vídeos (Select)
CREATE POLICY "Permitir Leitura do Storage" ON storage.objects 
  FOR SELECT USING (bucket_id = 'gado_gaucho_media');

-- Permite envios anônimos de mídia durante a inserção
CREATE POLICY "Permitir Envio Anonimo Storage" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'gado_gaucho_media');

-- Permite exclusão anônima de mídias (necessário para a limpeza client-side e server-side)
CREATE POLICY "Permitir Exclusao de Midia" ON storage.objects 
  FOR DELETE USING (bucket_id = 'gado_gaucho_media');
