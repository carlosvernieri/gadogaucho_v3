-- ==========================================
-- MIGRAÇÃO: Tabela de Categorias Contábeis Personalizáveis por Usuário
-- ==========================================

CREATE TABLE IF NOT EXISTS public.categorias_contabeis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA', 'AMBOS')),
    icone TEXT DEFAULT 'tag',  -- identificador de ícone no frontend (opcional)
    cor TEXT DEFAULT '#2D5A27', -- cor hex do badge (opcional)
    ordem INT DEFAULT 0,       -- para ordenação personalizada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Evitar duplicatas por usuário
    UNIQUE (user_id, nome)
);

-- Habilitar Row Level Security
ALTER TABLE public.categorias_contabeis ENABLE ROW LEVEL SECURITY;

-- Política de acesso por usuário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem gerenciar suas próprias categorias contábeis') THEN
        CREATE POLICY "Usuários podem gerenciar suas próprias categorias contábeis"
            ON public.categorias_contabeis FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
