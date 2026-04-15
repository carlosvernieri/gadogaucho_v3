# Guia de Atualização Semanal: Boletim de Inteligência de Mercado

Este documento descreve o processo passo a passo para atualizar os dados externos do Boletim Semanal (Scot Consultoria e B3). Os dados internos de leilões e ofertas do Gado Gaúcho são atualizados automaticamente pelo sistema.

## 1. Coleta de Dados da Scot Consultoria

Acesse os links abaixo toda segunda-feira para obter os preços atualizados das praças de **Pelotas** e **RS Oeste** (Fronteira):

*   **Boi Gordo**: [Cotações Scot - Boi Gordo](https://www.scotconsultoria.com.br/cotacoes/boi-gordo/)
*   **Vaca Gorda**: [Cotações Scot - Vaca Gorda](https://www.scotconsultoria.com.br/cotacoes/vaca-gorda/)
*   **Novilha**: [Cotações Scot - Novilha](https://www.scotconsultoria.com.br/cotacoes/novilha/)

**Dica**: Procure pelos valores na linha "RS - Pelotas" e "RS - Oeste". Use o valor "À Vista".

## 2. Coleta de Dados do Mercado Futuro (B3)

Consulte as expectativas do mercado financeiro para os meses seguintes:

*   **Fonte**: [Cotações B3 Boi Gordo](https://www.noticiasagricolas.com.br/cotacoes/boi-gordo) ou sites financeiros (Infomoney/Agrolink).
*   **O que coletar**: O valor do último fechamento em R$ por arroba (@) para o mês atual e os próximos 4 a 6 meses de maior liquidez (geralmente meses como Abril, Maio, Junho e Outubro).

## 3. Atualização no Código

Os dados devem ser inseridos no arquivo da API:
`app/api/market-report/route.ts`

### Passo a Passo no Arquivo:

1.  Localize o objeto `scotData` e atualize os valores numéricos de `price`:
    ```typescript
    const scotData = {
      pelotas: [
        { category: 'Boi Gordo', price: [NOVO_VALOR] },
        { category: 'Vaca Gorda', price: [NOVO_VALOR] },
        { category: 'Novilha', price: [NOVO_VALOR] },
      ],
      oeste: [ ... ]
    };
    ```

2.  Localize o array `b3Futures` e atualize os preços das arrobas. O sistema calculará o equivalente em Kg Vivo automaticamente:
    ```typescript
    const b3Futures = [
      { month: 'Abril/26', price: [VALOR_ROUBA], priceKg: ([VALOR_ROUBA] / 30).toFixed(2) },
      ...
    ];
    ```

## 4. Funcionamento Automático (Premissas)

O sistema foi configurado com as seguintes premissas para garantir a precisão dos dados sem necessidade de intervenção manual:

*   **Janela de Dados (Site)**: Para o comparativo "Média Gado Gaúcho", o sistema agora busca anúncios dos últimos **30 dias**. Isso fornece uma base estatística mais robusta do que a janela semanal de leilões.
*   **Mapeamento Inteligente de Categorias**: O sistema traduz automaticamente os termos de mercado para as categorias do banco de dados:
    *   **"Boi Gordo"**: Agrega anúncios de *Boi Castrado* e *Novilho*.
    *   **"Vaca"**: Agrega anúncios de *Vaca, Vaca Gorda e Vaca Descarte*.
*   **Atualização Automática**: Os dados de leilões (últimos 7 dias) e ofertas do site são recalculados toda vez que a página é carregada, refletindo o estado atual do banco de dados.

## 5. Verificação

Após salvar o arquivo de API, acesse a página `/relatorio-preco-do-gado` no seu navegador para garantir que:
1.  Os novos preços externos (Scot/B3) estão sendo exibidos corretamente.
2.  As variações percentuais (deltas) foram recalculadas.
3.  A coluna "Média Gado Gaúcho" está populada com base na nova janela de 30 dias.

---
**Nota**: Não é necessário mexer nos dados de Leilões ou Ofertas do site, pois a API faz a busca no banco de dados em tempo real considerando sempre os últimos 7 dias.
