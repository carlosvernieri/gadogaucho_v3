const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

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
} catch (e) {}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function main() {
  console.log('--- Buscando dados de Leilões, Placas (Plazas) e Ofertas ---');

  // 1. Fetch Plazas to map names
  const { data: plazas, error: errP } = await supabase
    .from('auction_plazas')
    .select('id, name');

  if (errP) {
    console.error('Erro ao buscar praças:', errP);
    return;
  }

  const plazaMap = {};
  plazas.forEach(p => {
    plazaMap[p.id] = p.name;
  });

  // 2. Fetch Auctions
  const { data: auctions, error: errA } = await supabase
    .from('auctions')
    .select('*')
    .order('auction_date', { ascending: false });

  if (errA) {
    console.error('Erro ao buscar leilões:', errA);
    return;
  }

  // 3. Fetch Offers count
  const { data: offers, error: errO } = await supabase
    .from('auction_offers')
    .select('id, auction_id');

  if (errO) {
    console.error('Erro ao buscar ofertas:', errO);
    return;
  }

  // Group offers by auction
  const offersByAuction = {};
  offers.forEach(o => {
    if (!offersByAuction[o.auction_id]) {
      offersByAuction[o.auction_id] = 0;
    }
    offersByAuction[o.auction_id]++;
  });

  const report = auctions.map(a => {
    const plazaName = plazaMap[a.plaza_id] || `Praça #${a.plaza_id}`;
    const dateFormatted = new Date(a.auction_date).toLocaleDateString('pt-BR', {
      timeZone: 'UTC'
    });
    return {
      id: a.id,
      date: dateFormatted,
      rawDate: a.auction_date,
      title: a.title || a.name || `Leilão #${a.id}`,
      plaza: plazaName,
      offersCount: offersByAuction[a.id] || 0
    };
  });

  console.log('\n--- Relatório Gerado ---');
  console.log(JSON.stringify({
    totalAuctions: auctions.length,
    totalOffers: offers.length,
    details: report
  }, null, 2));
}

main();
