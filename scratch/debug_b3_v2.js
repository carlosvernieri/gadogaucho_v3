
const axios = require('axios');
const cheerio = require('cheerio');

async function debugB3V2() {
  try {
    console.log('Fetching...');
    const { data } = await axios.get('https://www.noticiasagricolas.com.br/cotacoes/boi-gordo', { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const $ = cheerio.load(data);
    
    console.log('--- SCANNING ALL TABLES ---');
    $('table').each((i, table) => {
       const headerText = $(table).find('thead, tr').first().text().toLowerCase();
       if (headerText.includes('vencimento') || headerText.includes('mês') || headerText.includes('contrato')) {
          console.log(`\nPotential B3 Table found at index ${i}:`);
          console.log('Headers:', headerText.replace(/\s+/g, ' ').trim());
          $(table).find('tr').slice(0, 5).each((j, tr) => {
             console.log(`  Row ${j}:`, $(tr).text().replace(/\s+/g, ' ').trim());
          });
       }
    });

  } catch (e) { console.error('Error:', e.message); }
}

debugB3V2();
