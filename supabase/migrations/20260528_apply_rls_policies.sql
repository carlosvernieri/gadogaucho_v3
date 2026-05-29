-- ==============================================================================
-- REGRAS DE RLS DO SUPABASE PARA O GADO GAÚCHO
-- ==============================================================================

-- 1. Tabela public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- Qualquer pessoa pode ver os perfis dos vendedores
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (true);

-- Apenas o próprio usuário ou administradores podem editar o perfil
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (
    auth.uid()::text = id OR 
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );

-- Apenas administradores podem deletar usuários
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );


-- 2. Tabela public.listings (Anúncios)
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listings_select_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_insert_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_update_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_delete_policy" ON public.listings;

-- Leitura: Qualquer pessoa pode ler anúncios ativos (sold = false ou nulo).
-- Anúncios vendidos (sold = true) só podem ser vistos pelo dono ou admin.
CREATE POLICY "listings_select_policy" ON public.listings
  FOR SELECT USING (
    (sold = false OR sold IS NULL) OR 
    auth.uid()::text = user_id OR
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );

-- Inserção: Apenas usuários autenticados (associando ao próprio ID) ou admins
CREATE POLICY "listings_insert_policy" ON public.listings
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      auth.uid()::text = user_id OR
      (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
    )
  );

-- Atualização: Apenas o dono ou admin
CREATE POLICY "listings_update_policy" ON public.listings
  FOR UPDATE USING (
    auth.uid()::text = user_id OR 
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );

-- Deleção: Apenas o dono ou admin
CREATE POLICY "listings_delete_policy" ON public.listings
  FOR DELETE USING (
    auth.uid()::text = user_id OR 
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );


-- 3. Tabela public.favorites (Favoritos)
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_policy" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_policy" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_policy" ON public.favorites;

-- Leitura: Apenas o dono dos favoritos ou admin
CREATE POLICY "favorites_select_policy" ON public.favorites
  FOR SELECT USING (
    auth.uid()::text = user_id OR
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );

-- Inserção: Apenas o próprio usuário autenticado ou admin
CREATE POLICY "favorites_insert_policy" ON public.favorites
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      auth.uid()::text = user_id OR
      (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
    )
  );

-- Deleção: Apenas o próprio usuário ou admin
CREATE POLICY "favorites_delete_policy" ON public.favorites
  FOR DELETE USING (
    auth.uid()::text = user_id OR
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );


-- 4. Tabela public.messages (Mensagens)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;

-- Inserção: Liberado para qualquer pessoa enviar mensagens de contato (logados ou não)
CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT WITH CHECK (true);

-- Leitura: Apenas o vendedor (dono do anúncio relacionado) ou admin
CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = messages.listing_id 
      AND listings.user_id = auth.uid()::text
    ) OR
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );

-- Atualização (marcar como lido): Apenas o vendedor ou admin
CREATE POLICY "messages_update_policy" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = messages.listing_id 
      AND listings.user_id = auth.uid()::text
    ) OR
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );

-- Deleção: Apenas o vendedor ou admin
CREATE POLICY "messages_delete_policy" ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = messages.listing_id 
      AND listings.user_id = auth.uid()::text
    ) OR
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );
