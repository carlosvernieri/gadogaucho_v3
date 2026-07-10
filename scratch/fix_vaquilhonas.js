const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const parseAnimalText = (animalText) => {
  if (!animalText) return { batch_size: 1, avg_weight: 0 };
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

  return { batch_size, avg_weight };
};

async function main() {
  console.log('--- Buscando ofertas no banco com categoria em branco/nula ---');
  const { data: dbOffers, error: dbError } = await supabase
    .from('auction_offers')
    .select('*');

  if (dbError) {
    console.error('Erro ao buscar ofertas:', dbError);
    return;
  }

  const emptyOffers = dbOffers.filter(o => !o.category || o.category.trim() === '');
  console.log(`Encontradas ${emptyOffers.length} ofertas com categoria em branco no total.`);

  // Pasta de outputs
  const outputsDir = path.join(__dirname, '..', 'auction_ocr_poc', 'outputs');
  if (!fs.existsSync(outputsDir)) {
    console.log('Diretório de outputs do OCR não encontrado.');
    return;
  }

  const folders = fs.readdirSync(outputsDir);
  const lavrasFolders = folders.filter(f => f.startsWith('leilao_lavras_') || f.startsWith('leilao_lavras_do_sul_'));

  let updatedCount = 0;

  for (const folder of lavrasFolders) {
    const jsonPath = path.join(outputsDir, folder, 'process_result.json');
    if (!fs.existsSync(jsonPath)) continue;

    console.log(`\nProcessando arquivo: ${folder}/process_result.json`);
    const rawJson = fs.readFileSync(jsonPath, 'utf-8');
    let offers = [];
    try {
      offers = JSON.parse(rawJson);
    } catch (e) {
      console.error(`Erro ao ler JSON da pasta ${folder}:`, e.message);
      continue;
    }

    // Extrair ID do leilão a partir do nome da pasta (ex: leilao_lavras_2026_07_10_42 -> 42)
    const folderParts = folder.split('_');
    const auctionId = parseInt(folderParts[folderParts.length - 1], 10);
    if (isNaN(auctionId)) {
      console.log(`Não foi possível inferir ID do leilão para a pasta: ${folder}`);
      continue;
    }

    console.log(`Identificado leilão ID: ${auctionId}`);

    for (const o of offers) {
      const animalText = o.Animal || '';
      if (animalText.toUpperCase().includes('VAQUILHONA')) {
        const parsed = parseAnimalText(animalText);
        let price = parseFloat((o.Preço || '').replace('.', '').replace(',', '.')) || 0;
        let price_kg = parseFloat((o.Média || '').replace(',', '.')) || 0;
        let avg_weight = parsed.avg_weight;

        // Recuperação matemática (mesma lógica do route.ts)
        if (avg_weight === 0 && price > 0 && price_kg > 0) {
          avg_weight = Math.round(price / price_kg);
        } else if (price === 0 && avg_weight > 0 && price_kg > 0) {
          price = Math.round(price_kg * avg_weight);
        } else if (price_kg === 0 && price > 0 && avg_weight > 0) {
          price_kg = Math.round((price / avg_weight) * 100) / 100;
        }

        // Buscar no DB
        const match = emptyOffers.find(dbO => 
          dbO.auction_id === auctionId &&
          dbO.batch_size === parsed.batch_size &&
          Math.abs(dbO.price - price) < 2 &&
          Math.abs(dbO.price_kg - price_kg) < 0.1 &&
          Math.abs(dbO.avg_weight - avg_weight) < 2
        );

        if (match) {
          console.log(`Corrigindo Lote ${o.Lote} (${o.Animal}): ID no banco #${match.id} -> Categoria: 'Novilhas'`);
          const { error: updateError } = await supabase
            .from('auction_offers')
            .update({ category: 'Novilhas' })
            .eq('id', match.id);

          if (updateError) {
            console.error(`Erro ao atualizar #${match.id}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }
    }
  }

  console.log(`\nConcluído! ${updatedCount} ofertas de Vaquilhonas foram corrigidas no banco de dados.`);
}

main().catch(console.error);
