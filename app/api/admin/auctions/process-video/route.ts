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

  // Permite execução em rede interna desde que seja administrador authenticated

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

    // Remover pastas de output anteriores que terminam com _auctionId para economizar espaço
    const outputsBaseDir = path.join(process.cwd(), 'auction_ocr_poc', 'outputs');
    if (fs.existsSync(outputsBaseDir)) {
      try {
        const folders = fs.readdirSync(outputsBaseDir);
        const targetSuffix = `_${auctionId}`;
        for (const folder of folders) {
          if (folder.endsWith(targetSuffix)) {
            const folderPath = path.join(outputsBaseDir, folder);
            if (fs.statSync(folderPath).isDirectory()) {
              console.log(`[OCR] Removendo diretório de output antigo para economizar espaço: ${folderPath}`);
              fs.rmSync(folderPath, { recursive: true, force: true });
            }
          }
        }
      } catch (cleanError) {
        console.error('[OCR] Erro ao limpar diretórios antigos de output:', cleanError);
      }
    }

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
          const weightFixed = textFixedStart
            .replace(/O/gi, '0')
            .replace(/[Il|]/g, '1');
          const weightMatch = weightFixed.match(/(\d+)KG/i);
          if (weightMatch) {
            avg_weight = parseFloat(weightMatch[1]);
          }

          return { batch_size, category, breed, avg_weight };
        };

        // Helper para cálculo da mediana
        const getMedian = (values: number[]): number => {
          if (values.length === 0) return 0;
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        };

        // Valida e filtra lotes (rejeita peso ou preço igual a 0)
        const candidateOffers: any[] = [];
        const rejectedOffers: any[] = [];

        offers.forEach((o: any) => {
          const parsed = parseAnimalText(o.Animal || '');
          const price = parseFloat((o.Preço || '').replace('.', '').replace(',', '.')) || 0;
          const price_kg = parseFloat((o.Média || '').replace(',', '.')) || 0;
          const avg_weight = parsed.avg_weight;

          const offer = {
            auction_id: auctionId,
            batch_size: parsed.batch_size,
            category: parsed.category,
            breed: parsed.breed || null,
            price,
            price_kg,
            avg_weight,
            seller_name: o.Vendedor_Origem,
          };

          if (avg_weight === 0 || price === 0 || price_kg === 0) {
            rejectedOffers.push({
              ...o,
              _audit_reason: `avg_weight: ${avg_weight}, price: ${price}, price_kg: ${price_kg}`
            });
          } else {
            candidateOffers.push({ offer, original: o });
          }
        });

        // Detecção de Outliers por Categoria (Modified Z-Score / MAD)
        const categoriesMap: { [cat: string]: any[] } = {};
        candidateOffers.forEach(c => {
          const cat = c.offer.category || 'Outros';
          if (!categoriesMap[cat]) categoriesMap[cat] = [];
          categoriesMap[cat].push(c);
        });

        const validOffers: any[] = [];

        Object.keys(categoriesMap).forEach(cat => {
          const catCandidates = categoriesMap[cat];

          if (catCandidates.length < 3) {
            validOffers.push(...catCandidates.map(c => c.offer));
            return;
          }

          const prices = catCandidates.map(c => c.offer.price_kg);
          const medianPrice = getMedian(prices);
          const absoluteDeviations = prices.map(p => Math.abs(p - medianPrice));
          const mad = getMedian(absoluteDeviations);
          const dispersion = Math.max(mad, 0.1 * medianPrice);

          catCandidates.forEach(c => {
            const zScore = (0.6745 * (c.offer.price_kg - medianPrice)) / dispersion;
            if (Math.abs(zScore) > 3.5) {
              rejectedOffers.push({
                ...c.original,
                _audit_reason: `Outlier detectado na categoria ${cat} (Z-Score: ${zScore.toFixed(2)}, preço: R$ ${c.offer.price_kg.toFixed(2)}/kg, mediana da categoria: R$ ${medianPrice.toFixed(2)}/kg)`
              });
            } else {
              validOffers.push(c.offer);
            }
          });
        });

        // Grava arquivo de auditoria se houver rejeitados
        if (rejectedOffers.length > 0) {
          const auditJsonPath = path.join(outputDir, 'audit_rejected.json');
          fs.writeFileSync(auditJsonPath, JSON.stringify(rejectedOffers, null, 2), 'utf-8');
          console.log(`[OCR] Gravados ${rejectedOffers.length} registros rejeitados em: ${auditJsonPath}`);
        }

        // Limpa ofertas existentes para este leilão antes de inserir as novas
        const { error: deleteError } = await (supabaseAdmin.from('auction_offers') as any)
          .delete()
          .eq('auction_id', auctionId);

        if (deleteError) {
          console.error('[OCR] Erro ao limpar ofertas existentes:', deleteError);
          return resolve(NextResponse.json({ error: 'Erro ao limpar ofertas antigas do leilão.' }, { status: 500 }));
        }

        // Insere no banco via Supabase Admin apenas os válidos
        if (validOffers.length > 0) {
          const { error: dbError } = await (supabaseAdmin.from('auction_offers') as any)
            .insert(validOffers);

          if (dbError) {
            console.error('[OCR] Erro ao inserir no banco:', dbError);
            return resolve(NextResponse.json({ error: 'Erro ao salvar ofertas no banco.' }, { status: 500 }));
          }
        }

        return resolve(NextResponse.json({ 
          success: true, 
          message: `${validOffers.length} ofertas processadas e salvas. ${rejectedOffers.length} ofertas (peso/preço zero ou outliers) foram rejeitadas para auditoria.`,
          folder: outputFolderName
        }));
      });
    });

  } catch (error: any) {
    console.error('[OCR] Exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
