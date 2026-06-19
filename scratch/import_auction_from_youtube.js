const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 1. Argument Parsing
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const val = process.argv[i + 1];
    if (val && !val.startsWith('--')) {
      args[key] = val;
      i++;
    } else {
      args[key] = true;
    }
  }
}

const videoUrl = args.url;
const dateStr = args.date; // format YYYY-MM-DD
const plazaName = args.plaza;
let title = args.title;

if (!videoUrl || !dateStr || !plazaName) {
  console.error('Erro: Parâmetros obrigatórios ausentes!');
  console.log('Uso:');
  console.log('  node scratch/import_auction_from_youtube.js --url "<YOUTUBE_URL>" --date "<AAAA-MM-DD>" --plaza "<NOME_DA_PRACA>" [--title "<TITULO>"]');
  console.log('Exemplo:');
  console.log('  node scratch/import_auction_from_youtube.js --url "https://www.youtube.com/watch?v=3R-o5xWn2vQ" --date "2026-06-03" --plaza "Butiá" --title "Remate de Gado Geral Butiá"');
  process.exit(1);
}

// 2. Load Environment Variables from .env.local
const envVars = {};
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const firstEqual = trimmed.indexOf('=');
      if (firstEqual === -1) return;
      const key = trimmed.substring(0, firstEqual).trim();
      let val = trimmed.substring(firstEqual + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      envVars[key] = val;
    });
  }
} catch (e) {
  console.error('Erro ao ler .env.local:', e);
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Helper function to safe JSON stringify
function safeJsonStringify(obj, space = 2) {
  try {
    return JSON.stringify(obj, null, space);
  } catch (e) {
    return String(obj);
  }
}

// Helper to parse JSON fields
function parseJsonField(field) {
  if (!field) return [];
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      return [];
    }
  }
  return field;
}

// Helper to get median
function getMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper to parse animal text
function parseAnimalText(animalText) {
  const words = animalText.split(' ');
  if (words[0] && words[0].includes('O')) {
     words[0] = words[0].replace(/O/g, '0');
  }
  const textFixedStart = words.join(' ');
  const textUpper = textFixedStart.toUpperCase();
  
  let batch_size = 1;
  const batchMatch = textFixedStart.match(/^(\d+)/);
  if (batchMatch) {
    batch_size = parseInt(batchMatch[1], 10);
  }

  let category = '';
  if (textUpper.includes('TERNEIRO')) category = 'Terneiros';
  else if (textUpper.includes('TERNEIRA')) category = 'Terneiras';
  else if (textUpper.includes('NOVILHO')) category = 'Novilhos';
  else if (textUpper.includes('NOVILHA')) category = 'Novhas';
  else if (textUpper.includes('VACA')) {
     if (textUpper.includes('PRENHE')) category = 'Vacas Prenhes';
     else if (textUpper.includes('CRIA')) category = 'Vacas com Cria';
     else category = 'Vacas';
  }
  else if (textUpper.includes('TOURO')) category = 'Touros';
  else if (textUpper.includes('BOI')) category = 'Bois';

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
         breed = b.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
      }
      break;
    }
  }

  let avg_weight = 0;
  const weightMatch = textUpper.match(/\b([0-9OILI|BSZG]+)\s*(?:KG|K9|K|G)\b/);
  if (weightMatch) {
    let rawWeight = weightMatch[1];
    let cleanWeight = rawWeight
      .replace(/[O]/g, '0')
      .replace(/[IL|]/g, '1')
      .replace(/[B]/g, '8')
      .replace(/[S]/g, '5')
      .replace(/[Z]/g, '2')
      .replace(/[G]/g, '6');
    
    const parsedWeight = parseInt(cleanWeight, 10);
    if (!isNaN(parsedWeight) && parsedWeight > 0) {
      avg_weight = parsedWeight;
    }
  }

  return { batch_size, category, breed, avg_weight };
}

async function run() {
  try {
    console.log(`\n=== Iniciando Importação de Vídeo do YouTube ===`);
    console.log(`URL: ${videoUrl}`);
    console.log(`Data: ${dateStr}`);
    console.log(`Praça: ${plazaName}`);

    // 3. Buscar Praça no banco de dados
    const { data: plazas, error: errP } = await supabase
      .from('auction_plazas')
      .select('*')
      .ilike('name', `%${plazaName}%`);

    if (errP || !plazas || plazas.length === 0) {
      console.error(`Erro: Praça "${plazaName}" não encontrada no banco de dados!`);
      process.exit(1);
    }

    const plaza = plazas[0];
    console.log(`Praça associada: ${plaza.name} (ID: ${plaza.id})`);

    const finalTitle = title || `Leilão ${plaza.name} - ${new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;

    // 4. Criar ou Obter Leilão no banco de dados
    // Procuramos se já existe um leilão para esta praça nesta data
    const { data: existingAuctions } = await supabase
      .from('auctions')
      .select('*')
      .eq('plaza_id', plaza.id)
      .eq('auction_date', `${dateStr}T18:00:00+00:00`);

    let auctionId;
    if (existingAuctions && existingAuctions.length > 0) {
      auctionId = existingAuctions[0].id;
      console.log(`Leilão correspondente já existe (ID: ${auctionId}). Atualizando a URL do vídeo.`);
      await supabase
        .from('auctions')
        .update({ video_url: videoUrl })
        .eq('id', auctionId);
    } else {
      const { data: newAuction, error: errCreate } = await supabase
        .from('auctions')
        .insert([{
          plaza_id: plaza.id,
          auction_date: `${dateStr}T18:00:00+00:00`,
          video_url: videoUrl,
          commission: 0
        }])
        .select('*')
        .single();

      if (errCreate || !newAuction) {
        console.error('Erro ao criar leilão no banco de dados:', errCreate);
        process.exit(1);
      }
      auctionId = newAuction.id;
      console.log(`Novo leilão criado com ID: ${auctionId}`);
    }

    // 5. Preparar caminhos
    const safePlazaName = plazaName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const pythonScriptPath = path.join(process.cwd(), 'auction_ocr_poc', 'leilao_processor_final.py');
    const outputFolderName = `leilao_${safePlazaName}_${todayStr}_${auctionId}`;
    const outputDir = path.join(process.cwd(), 'auction_ocr_poc', 'outputs', outputFolderName);
    const resultJsonPath = path.join(outputDir, 'process_result.json');

    // Limpar output antigo se existir
    const outputsBaseDir = path.join(process.cwd(), 'auction_ocr_poc', 'outputs');
    if (fs.existsSync(outputsBaseDir)) {
      try {
        const folders = fs.readdirSync(outputsBaseDir);
        const targetSuffix = `_${auctionId}`;
        for (const folder of folders) {
          if (folder.endsWith(targetSuffix)) {
            const folderPath = path.join(outputsBaseDir, folder);
            if (fs.statSync(folderPath).isDirectory()) {
              console.log(`Limpando output antigo: ${folderPath}`);
              fs.rmSync(folderPath, { recursive: true, force: true });
            }
          }
        }
      } catch (cleanError) {
        console.error('Aviso ao limpar diretórios antigos:', cleanError.message);
      }
    }

    console.log(`\nIniciando execução do script Python de OCR (isso pode levar vários minutos)...`);
    console.log(`Script: ${pythonScriptPath}`);

    // 6. Spawn python script
    const pythonProcess = spawn('python', [
      '-u',
      pythonScriptPath,
      '--url', videoUrl,
      '--id', auctionId.toString(),
      '--name', safePlazaName
    ], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    pythonProcess.stdout.on('data', (data) => {
      process.stdout.write(`[Python]: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      process.stderr.write(`[Python Error]: ${data}`);
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`\nErro: O script Python finalizou com código de erro ${code}.`);
        process.exit(1);
      }

      console.log(`\nProcessamento do vídeo concluído pelo Python.`);

      // 7. Ler resultado JSON
      if (!fs.existsSync(resultJsonPath)) {
        console.error(`Erro: O arquivo de resultado ${resultJsonPath} não foi gerado.`);
        process.exit(1);
      }

      const rawData = fs.readFileSync(resultJsonPath, 'utf-8');
      const offers = JSON.parse(rawData);

      console.log(`Carregados ${offers.length} lotes do JSON. Executando filtragem e auditoria...`);

      // 8. Filtragem e recuperação matemática
      const candidateOffers = [];
      const rejectedOffers = [];

      offers.forEach((o) => {
        const parsed = parseAnimalText(o.Animal || '');
        let price = parseFloat((o.Preço || '').replace('.', '').replace(',', '.')) || 0;
        let price_kg = parseFloat((o.Média || '').replace(',', '.')) || 0;
        let avg_weight = parsed.avg_weight || 0;

        // Recuperação matemática
        if (avg_weight === 0 && price > 0 && price_kg > 0) {
          avg_weight = Math.round(price / price_kg);
        } else if (price === 0 && avg_weight > 0 && price_kg > 0) {
          price = Math.round(price_kg * avg_weight);
        } else if (price_kg === 0 && price > 0 && avg_weight > 0) {
          price_kg = Math.round((price / avg_weight) * 100) / 100;
        }

        const offer = {
          auction_id: auctionId,
          batch_size: parsed.batch_size,
          category: parsed.category || 'Gado Geral',
          breed: parsed.breed || null,
          price,
          price_kg,
          avg_weight,
          seller_name: o.Vendedor_Origem || null
        };

        if (avg_weight === 0 || price === 0 || price_kg === 0) {
          rejectedOffers.push({
            ...o,
            _audit_reason: `Faltando valores (peso: ${avg_weight}, preço: ${price}, preço_kg: ${price_kg})`
          });
        } else {
          candidateOffers.push({ offer, original: o });
        }
      });

      // Detecção de outliers
      const categoriesMap = {};
      candidateOffers.forEach(c => {
        const cat = c.offer.category;
        if (!categoriesMap[cat]) categoriesMap[cat] = [];
        categoriesMap[cat].push(c);
      });

      const validOffers = [];

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
              _audit_reason: `Outlier na categoria ${cat} (Z-Score: ${zScore.toFixed(2)}, preço: R$ ${c.offer.price_kg.toFixed(2)}/kg, mediana: R$ ${medianPrice.toFixed(2)}/kg)`
            });
          } else {
            validOffers.push(c.offer);
          }
        });
      });

      // Gravar auditoria se houver rejeitados
      if (rejectedOffers.length > 0) {
        const auditJsonPath = path.join(outputDir, 'audit_rejected.json');
        fs.writeFileSync(auditJsonPath, JSON.stringify(rejectedOffers, null, 2), 'utf-8');
        console.log(`[Auditoria] Gravados ${rejectedOffers.length} registros rejeitados em: ${auditJsonPath}`);
      }

      // 9. Deletar ofertas antigas e salvar novas
      console.log(`Limpando ofertas existentes para o leilão ID: ${auctionId}...`);
      await supabase
        .from('auction_offers')
        .delete()
        .eq('auction_id', auctionId);

      if (validOffers.length > 0) {
        console.log(`Inserindo ${validOffers.length} novas ofertas no banco de dados...`);
        const { error: dbError } = await supabase
          .from('auction_offers')
          .insert(validOffers);

        if (dbError) {
          console.error('Erro ao salvar ofertas no banco de dados:', dbError);
          process.exit(1);
        }
      }

      console.log(`\n=== IMPORTAÇÃO CONCLUÍDA COM SUCESSO! ===`);
      console.log(`Leilão ID: ${auctionId}`);
      console.log(`Ofertas válidas importadas: ${validOffers.length}`);
      console.log(`Ofertas rejeitadas para auditoria: ${rejectedOffers.length}`);
      process.exit(0);
    });
  } catch (error) {
    console.error('Erro crítico no processo de importação:', error);
    process.exit(1);
  }
}

run();
