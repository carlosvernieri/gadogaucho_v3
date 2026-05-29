import { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { MarketIntelligenceContent } from './MarketIntelligenceContent';
import { getMarketQuotes } from '@/lib/market-quotes';

export const metadata: Metadata = {
  title: 'Cotação e Inteligência de Mercado | Gado Gaúcho',
  description: 'Consulte os preços médios do Quilo Vivo (R$/kg) nas principais praças pecuárias do Rio Grande do Sul.',
};

// ISR desabilitado temporariamente (revalidate = 0 para forçar renderização dinâmica)
export const revalidate = 0;

export default async function PrecoDoGadoPage() {
  await draftMode();
  const praças = await getMarketQuotes();

  return <MarketIntelligenceContent praças={praças} />;
}

