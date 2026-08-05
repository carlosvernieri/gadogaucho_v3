-- ==========================================
-- MIGRAÇÃO: Adicionar colunas faltantes em almoxarifado_produtos
-- Colunas 'categoria' e 'custo_medio' são usadas pela API
-- mas não existiam na tabela original, causando falha silenciosa
-- na sincronização de insumos do lançamento para o estoque.
-- ==========================================

ALTER TABLE public.almoxarifado_produtos
    ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral',
    ADD COLUMN IF NOT EXISTS custo_medio NUMERIC(15, 4) DEFAULT 0.0000;
