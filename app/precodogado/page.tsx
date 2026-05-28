import { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { MarketIntelligenceContent } from './MarketIntelligenceContent';
import { getMarketQuotes } from '@/lib/market-quotes';

export const metadata: Metadata = {
  title: 'Cotação e Inteligência de Mercado | Gado Gaúcho',
  description: 'Consulte os preços médios do Quilo Vivo (R$/kg) nas principais praças pecuárias do Rio Grande do Sul.',
};

// ISR: re-gera a cada 30 minutos. Admin com Draft Mode ativo recebe dados sempre frescos.
export const revalidate = 1800;

export default async function PrecoDoGadoPage() {
  const praças = await getMarketQuotes();

  return <MarketIntelligenceContent praças={praças} />;
}

