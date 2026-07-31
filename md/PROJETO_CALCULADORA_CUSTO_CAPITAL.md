# 📊 Projeto: Calculadora de Custo de Capital & Financiamentos Rurais

## 🎯 Objetivo da Ferramenta

Permitir que o produtor rural ou gestor agropecuário insira as informações de seus financiamentos e empréstimos (bancários, finame, custeio, investimento ou crédito privado) e obtenha automaticamente o **Custo de Capital Mensalizado (R$/mês e % a.m.)**, o **Custo Efetivo Total (CET)** e a curva de desembolso ao longo do tempo.

A ferramenta resolverá um grande gargalo da pecuária: compreender o impacto real dos juros e amortizações no custo fixo mensal da propriedade e no custo por cabeça/hectare.

---

## 📥 1. Entradas de Dados (Inputs)

O usuário poderá cadastrar **um ou múltiplos financiamentos simultâneos** para calcular o custo de capital consolidado da fazenda.

### A. Dados Principais do Financiamento
- **Identificação do Contrato**: Ex: *Custeio Pecuário BB*, *Finame Trator ABC*, *Crédito Rural Pronaf*
- **Valor Principal Tomado (R$)**: Montante financiado
- **Data de Início / Liberação**: Data do crédito na conta
- **Data de Término / Vencimento**: Data da última parcela

### B. Condições Financeiras & Juros
- **Taxa de Juros**: Valor percentual (%)
- **Base da Taxa**: `% ao ano (a.a.)` ou `% ao mês (a.m.)`
- **Indexador / Correção**:
  - Pré-fixado (Taxa Fixa)
  - Pós-fixado (ex: IPCA +, CDI +, Selic +)
  - Crédito Subsidiado (PRONAF, PRONAMP, Moderfrota)
- **Periodicidade da Cobrança / Pagamento**:
  - Mensal
  - Trimestral
  - Semestral
  - Anual (muito comum no custeio agrícola/pecuário após safra/desmame)
  - *Bullet* / Parcela Única no Vencimento

### C. Carência e Encargos Adicionais
- **Período de Carência (Meses)**: Tempo sem amortização de capital
- **Cobrança de Juros na Carência?**: Sim / Não
- **Sistema de Amortização**:
  - **SAC** (Amortização Constante - parcelas decrescentes)
  - **PRICE / Tabela French** (Parcelas fixas)
  - **Amortização Única / Safra** (Pago integralmente no final)
- **Tarifas e Custos Iniciais (R$ ou %)**: IOF, taxa de abertura de crédito (TAC), vistoria, seguro rural obrigatório.

---

## 🧮 2. Motor de Cálculo & Fórmulas Matemáticas

### A. Conversão de Taxa Nominal para Taxa Mensalizada Equivalente ($i_{mensal}$)
Para converter taxas anuais compostas para a taxa equivalente mensal:
$$i_{mensal} = (1 + i_{anual})^{1/12} - 1$$

Para taxas anuais simples (se aplicável a juros rurais subsidiados):
$$i_{mensal} = \frac{i_{anual}}{12}$$

### B. Custo Efetivo Total (CET / TIR do Fluxo)
Calculado através da Taxa Interna de Retorno (TIR) do fluxo de caixa considerando as despesas iniciais (IOF, taxas) e todos os desembolsos periódicos:
$$Valor\_Liberado - Tarifas = \sum_{t=1}^{n} \frac{Parcela_t}{(1 + CET_{mensal})^t}$$

### C. Custo de Capital Mensalizado Líquido (R$/mês)
O sistema calcula o custo médio mensal dividindo o total de juros e encargos pelo número total de meses vigentes, além de apresentar a **prestação mensal equivalente ajustada**:
$$\text{Custo de Juros Mensal Médio} = \frac{\sum \text{Juros Totais} + \text{Tarifas Iniciais}}{\text{Total de Meses}}$$

### D. Métricas de Impacto Produtivo (Pecuária)
Quando o usuário informa o tamanho da área (ha) ou o número de cabeças do rebanho:
$$\text{Custo de Capital / Cabeça / Mês} = \frac{\text{Custo de Capital Mensalizado (R\$)}}{\text{Nº de Cabeças no Rebanho}}$$
$$\text{Custo de Capital / Hectare / Mês} = \frac{\text{Custo de Capital Mensalizado (R\$)}}{\text{Área Útil (ha)}}$$

---

## 📊 3. Entregáveis Visuais & Resultados (Outputs)

### A. Dashboard de Resumo Consolidado (Cards Principais)
1. **Custo de Capital Total Mensal (R$/mês)** — Soma do custo financeiro mensal de todos os contratos ativos.
2. **Taxa Média Ponderada (% a.m. e % a.a.)** — Custo percentual médio da dívida da propriedade.
3. **Total de Juros a Pagar no Período (R$)** — Montante acumulado pago ao banco além do principal.
4. **Impacto por Cabeça (R$/cabeça/mês)** — Quanto a dívida custa por animal mantido na fazenda.

### B. Gráficos Interativos
1. **Evolução do Saldo Devedor vs. Projeção de Amortização**: Gráfico de linha/área mostrando a redução da dívida ao longo do tempo.
2. **Composição da Parcela (Juros vs. Amortização)**: Gráfico de barras acumuladas mostrando o peso dos juros em cada pagamento.
3. **Cronograma de Desembolso Anual/Mensal**: Calendário financeiro dos vencimentos.

### C. Tabela do Cronograma Completo de Amortização (Exportável em PDF/Excel)
- Nº da Parcela | Data Vencimento | Saldo Devedor Inicial | Amortização | Juros | Tarifas/Seguro | Parcela Total | Saldo Devedor Final

---

## 🏗️ 4. Arquitetura Exclusiva no Módulo de Gestão (`/gestao`)

A ferramenta será disponibilizada **exclusivamente** dentro do Módulo de Gestão como uma nova aba chamada **"Financiamentos & Custo de Capital"** (`FinanciamentosTab.tsx`). Não haverá acesso público ou calculadora avulsa fora do ambiente restrito de gestão do produtor.

```
components/gestao/
├── GestaoModule.tsx               ← Aba 'financiamentos' integrada à navegação principal do módulo
├── FinanciamentosTab.tsx          ← NOVO: Painel de gestão de contratos, parcelas e custo mensalizado
├── FinanciamentoFormModal.tsx     ← NOVO: Cadastro/Edição de financiamento da fazenda
└── CronogramaAmortizacaoModal.tsx ← NOVO: Detalhamento do fluxo de caixa do contrato
```

### Principais Integrações Internas do Módulo:
1. **Associação com Fazendas e Contas Bancárias**: O financiamento fica obrigatoriamente vinculado à **Fazenda** selecionada e à **Conta Bancária** onde o recurso ingressou.
2. **Gerador Automático de Lançamentos de Despesa**: Possibilidade de gerar automaticamente os lançamentos financeiros no livro caixa (aba *Lançamentos*) nas datas de vencimento das parcelas/juros.
3. **Consolidação no DRE e Fluxo de Caixa**: O custo mensalizado dos juros entra automaticamente no DRE da fazenda e no cálculo de custo por hectare do Módulo de Gestão.

---

### Arquitetura de Banco de Dados (Supabase):
- **Tabela `financiamentos_rurais`**:
  - `id`, `fazenda_id`, `conta_id`, `identificacao`, `valor_principal`, `taxa_juros_anual`, `indexador`, `periodicidade`, `sistema_amortizacao`, `carencia_meses`, `data_inicio`, `data_fim`, `tarifas_iniciais`
- **Tabela `financiamento_parcelas`**:
  - `id`, `financiamento_id`, `numero_parcela`, `data_vencimento`, `valor_amortizacao`, `valor_juros`, `valor_total`, `pago`

---

## 🗓️ 5. Plano de Implementação em 4 Fases

| Fase | Descrição | Duração Est. |
|---|---|---|
| **Fase 1: Motor Matemático** | Criação das funções utilitárias de cálculo de parcelas (SAC/PRICE/Safra), conversão de taxas e CET. | 1 dia |
| **Fase 2: Componentes & UI (`FinanciamentosTab`)** | Construção da aba exclusiva do Módulo de Gestão com o formulário de cadastro de contratos (carência, taxa, prazo). | 1 dia |
| **Fase 3: Visualizações & Gráficos** | Implementação dos cards de métricas (R$/mês, R$/cab), gráficos Recharts e tabela expansível de amortização. | 1 dia |
| **Fase 4: Integração Supabase & DRE** | Criação das tabelas no Supabase, API de persistência por fazenda e integração automática com o Livro Caixa/DRE. | 1 dia |
