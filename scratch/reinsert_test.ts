import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      process.env[match[1]] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função copiada da rota
const parseAnimalText = (animalText: string) => {
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
         breed = b.split(' ').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
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

async function run() {
  console.log('Limpando tabela auction_offers...');
  // Para limpar todos, no Supabase o .delete() precisa de um eq. Como id > 0 sempre, usamos eq id ou neq id 0.
  const { error: delError } = await supabase.from('auction_offers').delete().neq('id', 0);
  if (delError) {
    console.error('Erro ao deletar ofertas:', delError);
    return;
  }
  console.log('Tabela limpa com sucesso!');

  // Função para carregar e inserir um json
  async function insertJson(folderName: string) {
    const filePath = path.join(process.cwd(), 'auction_ocr_poc', 'outputs', folderName, 'process_result.json');
    if (!fs.existsSync(filePath)) {
       console.log(`Arquivo não encontrado para ${folderName}: ${filePath}`);
       return;
    }
    
    // Identificar o leilão a partir do final do nome da pasta (ex: leilao_santa_ursula_2026_05_01_3 -> id = 3)
    const folderParts = folderName.split('_');
    const auctionIdStr = folderParts[folderParts.length - 1];
    const auctionId = parseInt(auctionIdStr, 10);

    if (isNaN(auctionId)) {
       console.log(`Não foi possível determinar o auctionId para a pasta: ${folderName}`);
       return;
    }

    console.log(`Usando leilão ID ${auctionId} para ${folderName}`);

    const rawData = fs.readFileSync(filePath, 'utf8');
    const offers = JSON.parse(rawData);

    const getMedian = (values: number[]): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

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
            _audit_reason: `Outlier detectado na categoria ${cat} (Z-Score: ${zScore.toFixed(2)}, preço: R$ ${c.offer.price_kg.toFixed(2)}/kg, mediana: R$ ${medianPrice.toFixed(2)}/kg)`
          });
        } else {
          validOffers.push(c.offer);
        }
      });
    });

    if (rejectedOffers.length > 0) {
      const auditJsonPath = path.join(process.cwd(), 'auction_ocr_poc', 'outputs', folderName, 'audit_rejected.json');
      fs.writeFileSync(auditJsonPath, JSON.stringify(rejectedOffers, null, 2), 'utf-8');
      console.log(`[Reinsert] ${rejectedOffers.length} registros rejeitados (peso/preço zero ou outliers) salvos em ${auditJsonPath}`);
    }

    console.log(`Inserindo ${validOffers.length} registros para ${folderName}...`);
    if (validOffers.length > 0) {
      // Print first 2 for debugging
      console.log('Exemplo 1:', validOffers[0]);
      if (validOffers.length > 1) {
        console.log('Exemplo 2:', validOffers[1]);
      }

      const { error: insError } = await supabase.from('auction_offers').insert(validOffers);
      if (insError) {
         console.error(`Erro ao inserir de ${folderName}:`, insError);
      } else {
         console.log(`Sucesso na inserção de ${folderName}!`);
      }
    } else {
      console.log(`Nenhuma oferta válida para inserir para ${folderName}.`);
    }
  }

  const outputsDir = path.join(process.cwd(), 'auction_ocr_poc', 'outputs');
  const folders = fs.readdirSync(outputsDir).filter(f => {
    const fullPath = path.join(outputsDir, f);
    return fs.statSync(fullPath).isDirectory() && f.startsWith('leilao_') && fs.existsSync(path.join(fullPath, 'process_result.json'));
  });

  console.log(`Encontradas ${folders.length} pastas de leilão para reprocessar: ${folders.join(', ')}`);
  for (const folder of folders) {
    await insertJson(folder);
  }

  console.log('Finalizado.');
}

run();
