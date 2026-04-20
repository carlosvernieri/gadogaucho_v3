import { NextResponse } from 'next/server';
import { getMarketQuotes } from '@/lib/market-quotes';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getMarketQuotes();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Market quotes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
