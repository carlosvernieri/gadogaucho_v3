import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let supabaseUrl = '';
let supabaseKey = '';

try {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = value;
      } else if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
        supabaseKey = value;
      }
    }
  }
} catch (e) {
  console.error('Failed to load env:', e);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase config:', { supabaseUrl, supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const STANDARD_CATEGORIES = [
  'Boi Castrado',
  'Gado de Leite',
  'Novilha',
  'Novilho',
  'Terneira',
  'Terneiro',
  'Touro',
  'Vaca',
  'Vaca com Cria',
  'Vaca Prenha'
];

const KNOWN_ALIASES: Record<string, string> = {
  'vaca': 'Vaca',
  'vacas': 'Vaca',
  'vaca gorda': 'Vaca',
  'vaca descarte': 'Vaca',
  'novilha': 'Novilha',
  'novilhas': 'Novilha',
  'novilho': 'Novilho',
  'novilhos': 'Novilho',
  'terneira': 'Terneira',
  'terneiras': 'Terneira',
  'terneiro': 'Terneiro',
  'terneiros': 'Terneiro',
  'vaca prenha': 'Vaca Prenha',
  'vacas prenhes': 'Vaca Prenha',
  'vaca com cria': 'Vaca com Cria',
  'vacas com cria': 'Vaca com Cria'
};

async function analyze() {
  console.log('=== ANALISANDO CATEGORIAS NO BANCO DE DADOS ===\n');

  // 1. Fetch unique categories from listings
  const { data: listingsData, error: listingsError } = await supabase
    .from('listings')
    .select('category');

  if (listingsError) {
    console.error('Erro ao buscar listings:', listingsError);
    process.exit(1);
  }

  // 2. Fetch unique categories from auction_offers
  const { data: offersData, error: offersError } = await supabase
    .from('auction_offers')
    .select('category');

  if (offersError) {
    console.error('Erro ao buscar auction_offers:', offersError);
    process.exit(1);
  }

  const listingsCategories = new Set<string>();
  listingsData?.forEach((item: any) => {
    if (item.category) listingsCategories.add(item.category.trim());
  });

  const offersCategories = new Set<string>();
  offersData?.forEach((item: any) => {
    if (item.category) offersCategories.add(item.category.trim());
  });

  console.log(`Categorias encontradas na tabela 'listings' (${listingsCategories.size} únicas):`);
  const listingsUnknown: string[] = [];
  const listingsMapped: Record<string, string> = {};

  listingsCategories.forEach(cat => {
    const normalized = cat.toLowerCase();
    if (STANDARD_CATEGORIES.includes(cat)) {
      listingsMapped[cat] = cat;
    } else if (KNOWN_ALIASES[normalized]) {
      listingsMapped[cat] = KNOWN_ALIASES[normalized];
    } else {
      listingsUnknown.push(cat);
    }
  });

  console.log('   Mapeadas com sucesso:');
  Object.entries(listingsMapped).forEach(([original, target]) => {
    console.log(`     - "${original}" -> "${target}"`);
  });

  if (listingsUnknown.length > 0) {
    console.log('   ⚠️ DESCONHECIDAS (Sem mapeamento claro):');
    listingsUnknown.forEach(cat => console.log(`     - "${cat}"`));
  } else {
    console.log('   ✅ Nenhuma categoria desconhecida em listings.');
  }

  console.log(`\nCategorias encontradas na tabela 'auction_offers' (${offersCategories.size} únicas):`);
  const offersUnknown: string[] = [];
  const offersMapped: Record<string, string> = {};

  offersCategories.forEach(cat => {
    const normalized = cat.toLowerCase();
    if (STANDARD_CATEGORIES.includes(cat)) {
      offersMapped[cat] = cat;
    } else if (KNOWN_ALIASES[normalized]) {
      offersMapped[cat] = KNOWN_ALIASES[normalized];
    } else {
      offersUnknown.push(cat);
    }
  });

  console.log('   Mapeadas com sucesso:');
  Object.entries(offersMapped).forEach(([original, target]) => {
    console.log(`     - "${original}" -> "${target}"`);
  });

  if (offersUnknown.length > 0) {
    console.log('   ⚠️ DESCONHECIDAS (Sem mapeamento claro):');
    offersUnknown.forEach(cat => console.log(`     - "${cat}"`));
  } else {
    console.log('   ✅ Nenhuma categoria desconhecida em auction_offers.');
  }
}

analyze();
