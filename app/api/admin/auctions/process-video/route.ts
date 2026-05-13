import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  // Verifica se é admin
  const session = await getSession();
  if (!session || !session.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Segurança: Apenas permite execução em ambiente local (verifica pelo Host)
  const host = request.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  if (!isLocal) {
    return NextResponse.json({ error: 'Este recurso só está disponível em execução local (GPU necessária).' }, { status: 403 });
  }

  try {
    const { auctionId, videoUrl, plazaName } = await request.json();

    if (!auctionId || !videoUrl) {
      return NextResponse.json({ error: 'Faltando auctionId ou videoUrl' }, { status: 400 });
    }

    const safePlazaName = plazaName ? plazaName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') : 'santa_ursula';

    // Caminhos para o script e outputs
    const pythonScriptPath = path.join(process.cwd(), 'auction_ocr_poc', 'leilao_processor_final.py');
    const outputFolderName = `leilao_${safePlazaName}_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}_${auctionId}`;
    const outputDir = path.join(process.cwd(), 'auction_ocr_poc', 'outputs', outputFolderName);
    const resultJsonPath = path.join(outputDir, 'process_result.json');

    console.log(`[OCR] Iniciando processamento para Leilão ${auctionId} (${safePlazaName})...`);

    return new Promise<NextResponse>((resolve) => {
      // Executa o Python
      const pythonProcess = spawn('python', [
        '-u', // unbuffered
        pythonScriptPath,
        '--url', videoUrl,
        '--id', auctionId.toString(),
        '--name', safePlazaName
      ], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python OCR]: ${data}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python OCR Error]: ${data}`);
      });

      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          return resolve(NextResponse.json({ error: 'O processo Python falhou.' }, { status: 500 }));
        }

        // Lê o resultado JSON
        if (!fs.existsSync(resultJsonPath)) {
          return resolve(NextResponse.json({ error: 'Arquivo de resultado não gerado.' }, { status: 500 }));
        }

        const rawData = fs.readFileSync(resultJsonPath, 'utf-8');
        const offers = JSON.parse(rawData);

        console.log(`[OCR] Processamento concluído. Inserindo ${offers.length} ofertas no banco...`);

        // Insere no banco via Supabase Admin
        const formattedOffers = offers.map((o: any) => ({
          auction_id: auctionId,
          batch_size: o.Animal.includes('0') ? parseInt(o.Animal.split(' ')[0]) : 1, // heurística simples
          category: o.Animal,
          price_kg: parseFloat(o.Preço.replace('.', '').replace(',', '.')) || 0,
          avg_weight: parseFloat(o.Animal.match(/\d+Kg/)?.[0].replace('Kg', '')) || 0,
          seller_name: o.Vendedor_Origem,
          // Outros campos podem ser nulos ou preenchidos depois
        }));

        const { error: dbError } = await (supabaseAdmin.from('auction_offers') as any)
          .insert(formattedOffers);

        if (dbError) {
          console.error('[OCR] Erro ao inserir no banco:', dbError);
          return resolve(NextResponse.json({ error: 'Erro ao salvar ofertas no banco.' }, { status: 500 }));
        }

        return resolve(NextResponse.json({ 
          success: true, 
          message: `${offers.length} ofertas processadas e salvas.`,
          folder: outputFolderName
        }));
      });
    });

  } catch (error: any) {
    console.error('[OCR] Exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
