export interface FinanciamentoInput {
  id?: string;
  fazenda_id?: string;
  conta_id?: string;
  identificacao: string;
  valor_principal: number;
  taxa_juros_anual: number; // e.g. 12 for 12% a.a.
  indexador?: string; // 'Pré-fixado', 'IPCA +', 'CDI +', 'PRONAF', etc.
  periodicidade: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'BULLET';
  sistema_amortizacao: 'SAC' | 'PRICE' | 'SAFRA_BULLET';
  carencia_meses: number;
  juros_na_carencia: boolean;
  data_inicio: string; // YYYY-MM-DD
  data_fim: string; // YYYY-MM-DD
  tarifas_iniciais: number; // IOF, TAC, seguros
}

export interface ParcelaCronograma {
  numero: number;
  data_vencimento: string; // YYYY-MM-DD
  saldo_devedor_inicial: number;
  amortizacao: number;
  juros: number;
  parcela_total: number;
  saldo_devedor_final: number;
}

export interface FinanciamentoResultado {
  financiamento: FinanciamentoInput;
  total_meses: number;
  taxa_mensal_equivalente: number; // % a.m.
  total_juros: number;
  total_pago: number;
  custo_efetivo_total_anual: number; // CET % a.a.
  custo_capital_mensal_medio: number; // R$/mês de juros + encargos
  prestacao_media_mensal: number; // R$/mês considerando principal + juros
  cronograma: ParcelaCronograma[];
}

/**
 * Calculates monthly equivalent interest rate from annual rate
 */
export function getTaxaMensalEquivalente(taxaAnual: number): number {
  if (taxaAnual <= 0) return 0;
  // Taxa composta: (1 + i_anual)^(1/12) - 1
  return (Math.pow(1 + taxaAnual / 100, 1 / 12) - 1) * 100;
}

/**
 * Helper to add months to a date string YYYY-MM-DD
 */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setMonth(d.getMonth() + monthsToAdd);
  return d.toISOString().substring(0, 10);
}

/**
 * Helper to calculate difference in months between two dates
 */
export function getMesesEntreDatas(dataInicio: string, dataFim: string): number {
  const d1 = new Date(dataInicio);
  const d2 = new Date(dataFim);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 12;
  const yearDiff = d2.getFullYear() - d1.getFullYear();
  const monthDiff = d2.getMonth() - d1.getMonth();
  const total = yearDiff * 12 + monthDiff;
  return total > 0 ? total : 1;
}

/**
 * Generates the full amortization schedule for a financing contract
 */
export function calcularFinanciamento(input: FinanciamentoInput): FinanciamentoResultado {
  const principal = Math.max(0, input.valor_principal || 0);
  const totalMeses = getMesesEntreDatas(input.data_inicio, input.data_fim);
  const taxaAnual = Math.max(0, input.taxa_juros_anual || 0);
  const iMensal = getTaxaMensalEquivalente(taxaAnual) / 100;
  const carencia = Math.min(totalMeses - 1, Math.max(0, input.carencia_meses || 0));
  const tarifas = Math.max(0, input.tarifas_iniciais || 0);

  // Interval in months per payment
  let intervalMeses = 1;
  switch (input.periodicidade) {
    case 'TRIMESTRAL': intervalMeses = 3; break;
    case 'SEMESTRAL': intervalMeses = 6; break;
    case 'ANUAL': intervalMeses = 12; break;
    case 'BULLET': intervalMeses = totalMeses; break;
    default: intervalMeses = 1; break;
  }

  const numParcelasTotal = Math.max(1, Math.floor(totalMeses / intervalMeses));
  const carenciaParcelas = Math.floor(carencia / intervalMeses);
  const numParcelasAmort = Math.max(1, numParcelasTotal - carenciaParcelas);

  // Rate per payment period
  const iPeriodo = Math.pow(1 + iMensal, intervalMeses) - 1;

  const cronograma: ParcelaCronograma[] = [];
  let saldoDevedor = principal;
  let totalJuros = 0;

  // SAC constant amortization per period
  const amortizacaoConstanteSAC = principal / numParcelasAmort;

  // PRICE fixed payment per period
  let prestacaoPRICE = 0;
  if (iPeriodo > 0) {
    prestacaoPRICE = (principal * iPeriodo) / (1 - Math.pow(1 + iPeriodo, -numParcelasAmort));
  } else {
    prestacaoPRICE = principal / numParcelasAmort;
  }

  for (let n = 1; n <= numParcelasTotal; n++) {
    const isCarencia = n <= carenciaParcelas;
    const dataVenc = addMonthsToDate(input.data_inicio, n * intervalMeses);
    const saldoInicial = saldoDevedor;

    let jurosPeriodo = saldoInicial * iPeriodo;
    let amort = 0;

    if (isCarencia) {
      if (input.juros_na_carencia) {
        // Pay interest only during grace period
        amort = 0;
      } else {
        // Capitalize interest during grace period
        saldoDevedor += jurosPeriodo;
        jurosPeriodo = 0;
        amort = 0;
      }
    } else {
      if (input.sistema_amortizacao === 'SAC') {
        amort = Math.min(saldoInicial, amortizacaoConstanteSAC);
      } else if (input.sistema_amortizacao === 'PRICE') {
        amort = Math.min(saldoInicial, Math.max(0, prestacaoPRICE - jurosPeriodo));
      } else {
        // SAFRA / BULLET: Amortize only at final installment
        if (n === numParcelasTotal) {
          amort = saldoInicial;
        } else {
          amort = 0;
        }
      }
    }

    const parcelaTotal = amort + (isCarencia && !input.juros_na_carencia ? 0 : jurosPeriodo);
    const saldoFinal = Math.max(0, saldoInicial - amort);
    saldoDevedor = saldoFinal;
    totalJuros += jurosPeriodo;

    cronograma.push({
      numero: n,
      data_vencimento: dataVenc,
      saldo_devedor_inicial: Math.round(saldoInicial * 100) / 100,
      amortizacao: Math.round(amort * 100) / 100,
      juros: Math.round(jurosPeriodo * 100) / 100,
      parcela_total: Math.round(parcelaTotal * 100) / 100,
      saldo_devedor_final: Math.round(saldoFinal * 100) / 100,
    });
  }

  const totalPago = principal + totalJuros + tarifas;
  const custoCapitalMensalMedio = (totalJuros + tarifas) / Math.max(1, totalMeses);
  const prestacaoMediaMensal = totalPago / Math.max(1, totalMeses);

  // CET calculation (approximate annualized rate including fees)
  const custoTotalPercentual = ((totalPago - principal) / (principal || 1)) * (12 / Math.max(1, totalMeses)) * 100;
  const cetAnual = Math.round((taxaAnual + (tarifas / (principal || 1)) * (12 / Math.max(1, totalMeses)) * 100) * 100) / 100;

  return {
    financiamento: input,
    total_meses: totalMeses,
    taxa_mensal_equivalente: Math.round(iMensal * 100 * 100) / 100,
    total_juros: Math.round(totalJuros * 100) / 100,
    total_pago: Math.round(totalPago * 100) / 100,
    custo_efetivo_total_anual: cetAnual || custoTotalPercentual,
    custo_capital_mensal_medio: Math.round(custoCapitalMensalMedio * 100) / 100,
    prestacao_media_mensal: Math.round(prestacaoMediaMensal * 100) / 100,
    cronograma,
  };
}
