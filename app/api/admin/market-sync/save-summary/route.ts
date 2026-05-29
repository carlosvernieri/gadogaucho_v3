import { NextResponse } from 'next/server';
import { saveMarketData } from '@/lib/market-scraper';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { aiSummary } = await request.json();
    await saveMarketData({ aiSummary });
    
    return NextResponse.json({ success: true, message: 'Resumo atualizado com sucesso!' });
  } catch (error: any) {
    console.error('Error saving manual summary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
