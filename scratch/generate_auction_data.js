const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://samxgkpylumzyvjmraju.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const RS_CITIES = [
    { name: "Alegrete", lat: -29.7902, lng: -55.7949 },
    { name: "Bagé", lat: -31.3297, lng: -54.0999 },
    { name: "Caxias do Sul", lat: -29.1629, lng: -51.1792 },
    { name: "Dom Pedrito", lat: -30.9756, lng: -54.6694 },
    { name: "Erechim", lat: -27.6364, lng: -52.2697 },
    { name: "Ijuí", lat: -28.388, lng: -53.92 },
    { name: "Passo Fundo", lat: -28.2576, lng: -52.4091 },
    { name: "Pelotas", lat: -31.7649, lng: -52.3371 },
    { name: "Santa Maria", lat: -29.6868, lng: -53.8149 },
    { name: "Uruguaiana", lat: -29.7614, lng: -57.0853 },
    { name: "Vacaria", lat: -28.5079, lng: -50.9418 }
];

const SELLER_NAMES = [
    'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Souza', 
    'Carlos Lima', 'Fernanda Costa', 'Ricardo Pereira', 'Juliana Rocha'
];

const CATEGORIES = [
    'Boi Castrado', 'Gado de Leite', 'Novilha', 'Novilho', 
    'Terneira', 'Terneiro', 'Touro', 'Vaca', 'Vaca com Cria', 'Vaca Prenha'
];

async function generateData() {
    console.log('--- Iniciando geração de 1000 registros ---');

    // 1. Obter Praças Existentes
    const { data: plazas } = await supabase.from('auction_plazas').select('id');
    if (!plazas || plazas.length === 0) {
        console.error('Nenhuma praça encontrada.');
        return;
    }

    // 2. Criar Leilões para as últimas 4 semanas
    console.log('Criando leilões...');
    const auctions = [];
    for (let i = 0; i < 15; i++) {
        const plaza = plazas[Math.floor(Math.random() * plazas.length)];
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 28));
        
        const { data: newAuction } = await supabase.from('auctions').insert([{
            plaza_id: plaza.id,
            auction_date: date.toISOString(),
            commission: (3.5 + Math.random()).toFixed(1)
        }]).select().single();
        
        if (newAuction) auctions.push(newAuction);
    }

    if (auctions.length === 0) {
        console.error('Falha ao criar leilões.');
        return;
    }

    // 3. Gerar 1000 Ofertas
    console.log(`Gerando 1000 ofertas distribuídas em ${auctions.length} leilões...`);
    const batchSize = 100; // Inserir em lotes de 100 para evitar timeout
    const totalRecords = 1000;
    
    for (let i = 0; i < totalRecords; i += batchSize) {
        const offersBatch = [];
        for (let j = 0; j < batchSize && (i + j) < totalRecords; j++) {
            const auction = auctions[Math.floor(Math.random() * auctions.length)];
            const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
            const city = RS_CITIES[Math.floor(Math.random() * RS_CITIES.length)];
            const seller = SELLER_NAMES[Math.floor(Math.random() * SELLER_NAMES.length)];
            
            offersBatch.push({
                auction_id: auction.id,
                category: category,
                price_kg: parseFloat((8.5 + Math.random() * 4).toFixed(2)),
                avg_weight: Math.floor(180 + Math.random() * 370),
                batch_size: Math.floor(5 + Math.random() * 55),
                seller_name: seller,
                seller_city: city.name,
                seller_lat: city.lat,
                seller_lng: city.lng
            });
        }
        
        const { error } = await supabase.from('auction_offers').insert(offersBatch);
        if (error) {
            console.error('Erro ao inserir lote:', error);
        } else {
            console.log(`Lote de ${offersBatch.length} registros inserido com sucesso (${i + offersBatch.length}/${totalRecords})`);
        }
    }

    console.log('--- Geração concluída! ---');
}

generateData();
