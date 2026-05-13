const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadAuctionData(folderName, auctionName, auctionDate) {
  const filePath = path.join(__dirname, 'outputs', folderName, 'process_result.json');
  
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  const lots = JSON.parse(rawData);

  console.log(`Iniciando upload de ${lots.length} lotes para o leilão: ${auctionName} (${auctionDate})`);

  // 1. Criar ou buscar o leilão
  const { data: auction, error: aError } = await supabase
    .from('auctions')
    .insert([{ name: auctionName, auction_date: auctionDate }])
    .select()
    .single();

  if (aError) {
    console.error('Erro ao criar leilão:', aError);
    return;
  }

  const auctionId = auction.id;
  console.log(`Leilão criado com ID: ${auctionId}`);

  // 2. Mapear e inserir lotes
  const offersToInsert = lots.map(lot => {
    // Tenta extrair a categoria do texto do animal
    let category = 'Outros';
    const animalText = lot.Animal.toUpperCase();
    if (animalText.includes('BOI') || animalText.includes('NOVILHO')) category = 'Boi Gordo';
    else if (animalText.includes('VACA')) category = 'Vaca';
    else if (animalText.includes('NOVILHA')) category = 'Novilha';
    else if (animalText.includes('TERNEIRO')) category = 'Terneiro';
    else if (animalText.includes('TERNEIRA')) category = 'Terneira';

    return {
      auction_id: auctionId,
      lote: lot.Lote,
      category: category,
      description: lot.Animal,
      seller: lot.Vendedor_Origem,
      price_total: parseFloat(lot.Preço.replace('.', '').replace(',', '.')),
      price_kg: parseFloat(lot.Média.replace(',', '.')),
      screenshot_url: lot.screenshot,
      timestamp_video: lot.Timestamp_Video || ''
    };
  });

  const { error: oError } = await supabase
    .from('auction_offers')
    .insert(offersToInsert);

  if (oError) {
    console.error('Erro ao inserir lotes:', oError);
  } else {
    console.log(`Upload concluído com sucesso! ${offersToInsert.length} lotes inseridos.`);
  }
}

// Execução
const folder = process.argv[2];
const name = process.argv[3];
const date = process.argv[4];

if (!folder || !name || !date) {
  console.log('Uso: node upload_results.js <folder_name> <auction_name> <date_yyyy_mm_dd>');
  process.exit(1);
}

uploadAuctionData(folder, name, date);
