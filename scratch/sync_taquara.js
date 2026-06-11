const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente do .env.local manualmente sem dependências externas
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.warn('Could not read .env.local:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase environment variables not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const parseAnimalText = (animalText) => {
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
         breed = b.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
      }
      break;
    }
  }

  // 4. Weight
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
};

async function main() {
  const auctionId = 29;
  const resultsPath = path.resolve(__dirname, '../auction_ocr_poc/outputs/leilao_taquara_2026_06_10_29/process_result.json');
  
  if (!fs.existsSync(resultsPath)) {
    console.error('File not found:', resultsPath);
    return;
  }
  
  const rawData = fs.readFileSync(resultsPath, 'utf8');
  const offers = JSON.parse(rawData);
  
  console.log(`Loaded ${offers.length} offers. Processing...`);
  
  const validOffers = [];
  
  offers.forEach(o => {
    const parsed = parseAnimalText(o.Animal || '');
    let price = parseFloat((o.Preço || '').replace('.', '').replace(',', '.')) || 0;
    let price_kg = parseFloat((o.Média || '').replace(',', '.')) || 0;
    let avg_weight = parsed.avg_weight;

    // Recovery layer
    if (avg_weight === 0 && price > 0 && price_kg > 0) {
      avg_weight = Math.round(price / price_kg);
    } else if (price === 0 && avg_weight > 0 && price_kg > 0) {
      price = Math.round(price_kg * avg_weight);
    } else if (price_kg === 0 && price > 0 && avg_weight > 0) {
      price_kg = Math.round((price / avg_weight) * 100) / 100;
    }

    if (avg_weight > 0 && price > 0 && price_kg > 0) {
      validOffers.push({
        auction_id: auctionId,
        batch_size: parsed.batch_size,
        category: parsed.category,
        breed: parsed.breed || null,
        price,
        price_kg,
        avg_weight,
        seller_name: o.Vendedor_Origem,
      });
    }
  });

  console.log(`Prepared ${validOffers.length} valid offers. Cleaning up old offers in DB...`);
  
  const { error: deleteError } = await supabase
    .from('auction_offers')
    .delete()
    .eq('auction_id', auctionId);

  if (deleteError) {
    console.error('Error deleting old offers:', deleteError);
    return;
  }

  console.log('Old offers deleted. Inserting new ones...');
  
  const { error: insertError } = await supabase
    .from('auction_offers')
    .insert(validOffers);

  if (insertError) {
    console.error('Error inserting offers:', insertError);
  } else {
    console.log(`Successfully synced ${validOffers.length} offers to auction ID ${auctionId}!`);
  }
}

main();
