
const axios = require('axios');
const cheerio = require('cheerio');

async function debugNoticiasAgricolas() {
  try {
    const { data } = await axios.get('https://www.noticiasagricolas.com.br/cotacoes/boi-gordo', { 
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);
    
    console.log('--- EXAMINING TABLES ---');
    $('table').each((i, table) => {
       console.log(`\nTABLE ${i}:`);
       $(table).find('tr').slice(0, 3).each((j, tr) => {
          console.log(`  TR ${j}:`, $(tr).text().replace(/\s+/g, ' ').trim());
       });
    });

  } catch (e) { console.error(e.message); }
}

debugNoticiasAgricolas();
