import { Metadata } from 'next';
import { MarketIntelligenceContent } from './MarketIntelligenceContent';
import { getMarketQuotes } from '@/lib/market-quotes';

export const metadata: Metadata = {
  title: 'Cotação e Inteligência de Mercado | Gado Gaúcho',
  description: 'Consulte os preços médios do Quilo Vivo (R$/kg) nas principais praças pecuárias do Rio Grande do Sul.',
};

// Next.js config to ensure the page is always fresh if needed, or we can leave it dynamic.
// Since quotes might change, force-dynamic is safer for now.
export const dynamic = 'force-dynamic';

export default async function PrecoDoGadoPage() {
  const praças = await getMarketQuotes();

  return <MarketIntelligenceContent praças={praças} />;
}

