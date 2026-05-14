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

        // Função para extrair dados estruturados do texto da descrição
        const parseAnimalText = (animalText: string) => {
          // Trata possíveis erros de OCR no início da string (ex: 'O6' em vez de '06')
          const words = animalText.split(' ');
          if (words[0] && words[0].includes('O')) {
             words[0] = words[0].replace(/O/g, '0');
          }
          const textFixedStart = words.join(' ');
          const textUpper = textFixedStart.toUpperCase();
          
          // 1. Batch Size
          let batch_size = 1;
          const batchMatch = textFixedStart.match(/^(\d+)/);
          if (batchMatch) {
            batch_size = parseInt(batchMatch[1], 10);
          }

          // 2. Category
          let category = '';
          if (textUpper.includes('TERNEIRO')) category = 'Terneiros';
          else if (textUpper.includes('TERNEIRA')) category = 'Terneiras';
          else if (textUpper.includes('NOVILHO')) category = 'Novilhos';
          else if (textUpper.includes('NOVILHA')) category = 'Novilhas';
          else if (textUpper.includes('VACA')) {
             if (textUpper.includes('PRENHE')) category = 'Vacas Prenhes';
             else if (textUpper.includes('CRIA')) category = 'Vacas com Cria';
             else category = 'Vacas';
          }
          else if (textUpper.includes('TOURO')) category = 'Touros';
          else if (textUpper.includes('BOI')) category = 'Bois';

          // 3. Breed
          let breed = '';
          const breeds = [
            'CRUZA ANGUS', 'CRUZA BRAFORD', 'CRUZA BRANGUS', 'CRUZA RED', 'CRUZA',
            'RED ANGUS', 'ABERDEEN', 'ANGUS', 'BRAFORD', 'BRANGUS', 'HEREFORD', 
            'CHAROLÊS', 'CHAROLES', 'NELORE', 'DEVON', 'LIMOUSIN', 'BRAHMAN', 
            'SENEPOL', 'SHORTHORN'
          ];
          for (const b of breeds) {
            if (textUpper.includes(b)) {
              if (b === 'ABERDEEN' || b === 'ANGUS' || b === 'RED ANGUS') {
                 breed = textUpper.includes('RED') ? 'Red Angus' : 'Angus';
              } else if (b === 'CHAROLES' || b === 'CHAROLÊS') {
                 breed = 'Charolês';
              } else if (b === 'CRUZA RED') {
                 breed = 'Cruza Angus';
              } else {
                 // Title Case para as demais
                 breed = b.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
              }
              break;
            }
          }

          // 4. Weight
          let avg_weight = 0;
          const weightMatch = textFixedStart.replace(/O/gi, '0').match(/(\d+)KG/i);
          if (weightMatch) {
            avg_weight = parseFloat(weightMatch[1]);
          }

          return { batch_size, category, breed, avg_weight };
        };

        // Insere no banco via Supabase Admin
        const formattedOffers = offers.map((o: any) => {
          const parsed = parseAnimalText(o.Animal || '');
          return {
            auction_id: auctionId,
            batch_size: parsed.batch_size,
            category: parsed.category,
            breed: parsed.breed || null,
            price_kg: parseFloat((o.Preço || '').replace('.', '').replace(',', '.')) || 0,
            avg_weight: parsed.avg_weight,
            seller_name: o.Vendedor_Origem,
            // Outros campos podem ser nulos ou preenchidos depois
          };
        });

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
