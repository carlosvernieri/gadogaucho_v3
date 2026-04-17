
const axios = require('axios');
const cheerio = require('cheerio');

async function debugB3() {
  try {
    const { data } = await axios.get('https://www.noticiasagricolas.com.br/cotacoes/boi-gordo', { 
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);
    
    console.log('--- SEARCHING FOR FUTURES DATA ---');
    $('table').each((i, table) => {
       const text = $(table).text();
       if (text.includes('MAI') && text.includes('JUN') && (text.includes('B3') || text.includes('vencimento'))) {
          console.log(`\nCANDIDATE TABLE ${i}:`);
          $(table).find('tr').each((j, tr) => {
             console.log(`  TR ${j}:`, $(tr).text().replace(/\s+/g, ' ').trim());
          });
       }
    });

  } catch (e) { console.error(e.message); }
}

debugB3();
