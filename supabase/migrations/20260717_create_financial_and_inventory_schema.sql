-- ==========================================
-- SCHEMA DE BANCO DE DADOS: HUB FINANCEIRO E CONTÁBIL RURAL (GADO GAÚCHO)
-- ==========================================

-- 1. TABELA DE PROPRIEDADES (FAZENDAS)
CREATE TABLE IF NOT EXISTS public.fazendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    nirf_cafir TEXT NOT NULL,
    incra TEXT,
    area_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE SÓCIOS E PARCERIAS (RATEIO)
CREATE TABLE IF NOT EXISTS public.parcerias_imoveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
    nome_socio TEXT NOT NULL,
    cpf_socio TEXT NOT NULL,
    percentual_participacao NUMERIC(5, 2) NOT NULL CHECK (percentual_participacao > 0 AND percentual_participacao <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE CONTAS BANCÁRIAS (REQUISITO LCDPR)
CREATE TABLE IF NOT EXISTS public.contas_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    banco_nome TEXT NOT NULL,
    agencia TEXT NOT NULL,
    conta_numero TEXT NOT NULL,
    tipo_conta TEXT NOT NULL DEFAULT 'Corrente', -- ex: 'Corrente', 'Poupança'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE PARTICIPANTES (FORNECEDORES, CLIENTES, PARCEIROS)
CREATE TABLE IF NOT EXISTS public.participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT NOT NULL,
    inscricao_estadual TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE LANÇAMENTOS DO LIVRO CAIXA
CREATE TABLE IF NOT EXISTS public.lancamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE RESTRICT,
    conta_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE RESTRICT,
    participante_id UUID REFERENCES public.participantes(id) ON DELETE SET NULL,
    data_pagamento DATE NOT NULL,
    tipo_movimento TEXT NOT NULL CHECK (tipo_movimento IN ('RECEITA', 'DESPESA')),
    classificacao TEXT NOT NULL, -- ex: 'Nutrição', 'Sanidade', 'Combustíveis', 'Vendas de Gado', etc.
    valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
    numero_documento TEXT NOT NULL, -- ex: Número de Nota Fiscal, Recibo ou Contrato
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE DETALHAMENTO DE ITENS DA NOTA FISCAL (OPCIONAL/GERENCIAL)
CREATE TABLE IF NOT EXISTS public.lancamento_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lancamento_id UUID NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL, -- ex: 'Saco Proteinado 40kg', 'Vacina Aftosa 50ml'
    quantidade NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    valor_unitario NUMERIC(15, 4) NOT NULL,
    valor_total NUMERIC(15, 2) NOT NULL,
    classificacao_item TEXT, -- ex: Permite classificar itens diferentes da mesma nota em contas diferentes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE PRODUTOS NO ALMOXARIFADO (ESTOQUE)
CREATE TABLE IF NOT EXISTS public.almoxarifado_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    unidade_medida TEXT NOT NULL, -- ex: 'Saco', 'Frasco', 'Litro', 'Kg'
    quantidade_atual NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELA DE MOVIMENTAÇÕES DE ALMOXARIFADO (ENTRADAS E SAÍDAS)
CREATE TABLE IF NOT EXISTS public.almoxarifado_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.almoxarifado_produtos(id) ON DELETE CASCADE,
    lancamento_item_id UUID REFERENCES public.lancamento_itens(id) ON DELETE SET NULL, -- Origem da compra (XML) se houver
    tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('ENTRADA', 'SAIDA')),
    quantidade NUMERIC(12, 4) NOT NULL CHECK (quantidade > 0),
    data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    observacoes TEXT
);

-- HABILITAR SEGURANÇA POR LINHA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.fazendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcerias_imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almoxarifado_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almoxarifado_movimentacoes ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO (RLS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem gerenciar suas próprias fazendas') THEN
        CREATE POLICY "Usuários podem gerenciar suas próprias fazendas" 
            ON public.fazendas FOR ALL TO authenticated 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem gerenciar itens de seus próprios lançamentos') THEN
        CREATE POLICY "Usuários podem gerenciar itens de seus próprios lançamentos" 
            ON public.lancamento_itens FOR ALL TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.lancamentos l
                    JOIN public.fazendas f ON l.fazenda_id = f.id
                    WHERE l.id = public.lancamento_itens.lancamento_id AND f.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem gerenciar seus próprios produtos no estoque') THEN
        CREATE POLICY "Usuários podem gerenciar seus próprios produtos no estoque" 
            ON public.almoxarifado_produtos FOR ALL TO authenticated 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem gerenciar movimentações de seus produtos') THEN
        CREATE POLICY "Usuários podem gerenciar movimentações de seus produtos" 
            ON public.almoxarifado_movimentacoes FOR ALL TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.almoxarifado_produtos p
                    WHERE p.id = public.almoxarifado_movimentacoes.produto_id AND p.user_id = auth.uid()
                )
            );
    END IF;
END $$;
