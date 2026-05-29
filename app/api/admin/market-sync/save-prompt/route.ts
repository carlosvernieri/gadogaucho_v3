import { NextResponse } from 'next/server';
import { getPromptSettings, savePromptSettings } from '@/lib/market-scraper';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getPromptSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await request.json();
    const success = await savePromptSettings({ prompt });
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Configurações de prompt salvas com sucesso!' });
    } else {
      return NextResponse.json({ success: false, error: 'Erro ao salvar configurações no disco.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error saving prompt settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
