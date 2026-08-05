-- ==========================================
-- MIGRAÇÃO: Políticas RLS faltantes para isolamento completo por usuário
-- ==========================================

-- Política para contas_bancarias
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem gerenciar suas próprias contas bancárias') THEN
        CREATE POLICY "Usuários podem gerenciar suas próprias contas bancárias"
            ON public.contas_bancarias FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Política para participantes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem gerenciar seus próprios participantes') THEN
        CREATE POLICY "Usuários podem gerenciar seus próprios participantes"
            ON public.participantes FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Política para lancamentos (via join com fazendas)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem gerenciar lançamentos de suas fazendas') THEN
        CREATE POLICY "Usuários podem gerenciar lançamentos de suas fazendas"
            ON public.lancamentos FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.fazendas f
                    WHERE f.id = public.lancamentos.fazenda_id AND f.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Política para parcerias_imoveis (via join com fazendas)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem gerenciar parcerias de suas fazendas') THEN
        CREATE POLICY "Usuários podem gerenciar parcerias de suas fazendas"
            ON public.parcerias_imoveis FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.fazendas f
                    WHERE f.id = public.parcerias_imoveis.fazenda_id AND f.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Política para financiamentos_rurais (caso a tabela exista)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financiamentos_rurais') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários gerenciam seus próprios financiamentos' AND tablename = 'financiamentos_rurais') THEN
            CREATE POLICY "Usuários gerenciam seus próprios financiamentos"
                ON public.financiamentos_rurais FOR ALL TO authenticated
                USING (auth.uid() = user_id)
                WITH CHECK (auth.uid() = user_id);
        END IF;
    END IF;
END $$;
