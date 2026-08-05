-- Migration: Criar tabela de financiamentos rurais no Supabase
CREATE TABLE IF NOT EXISTS public.financiamentos_rurais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    fazenda_id UUID REFERENCES public.fazendas(id) ON DELETE SET NULL,
    conta_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
    identificacao TEXT NOT NULL,
    valor_principal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    taxa_juros_anual NUMERIC(6, 3) NOT NULL DEFAULT 0,
    indexador TEXT DEFAULT 'Pré-fixado',
    periodicidade TEXT NOT NULL DEFAULT 'MENSAL',
    sistema_amortizacao TEXT NOT NULL DEFAULT 'SAC',
    carencia_meses INT DEFAULT 0,
    juros_na_carencia BOOLEAN DEFAULT TRUE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tarifas_iniciais NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.financiamentos_rurais ENABLE ROW LEVEL SECURITY;

-- Política de Acesso por Usuário Logado
CREATE POLICY "Usuários gerenciam seus próprios financiamentos"
ON public.financiamentos_rurais
FOR ALL
USING (auth.uid() = user_id);
