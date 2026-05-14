import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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
  const weightMatch = textFixedStart.replace(/O/gi, '0').match(/(\d+)KG/i);
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
      };
    });

    console.log(`Inserindo ${formattedOffers.length} registros para ${folderName}...`);
    // Print first 2 for debugging
    console.log('Exemplo 1:', formattedOffers[0]);
    console.log('Exemplo 2:', formattedOffers[1]);

    const { error: insError } = await supabase.from('auction_offers').insert(formattedOffers);
    if (insError) {
       console.error(`Erro ao inserir de ${folderName}:`, insError);
    } else {
       console.log(`Sucesso na inserção de ${folderName}!`);
    }
  }

  await insertJson('leilao_santa_ursula_2026_05_01_3');
  await insertJson('leilao_butia_2026_05_13_20');

  console.log('Finalizado.');
}

run();
