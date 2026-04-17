
const axios = require('axios');
const cheerio = require('cheerio');

async function debugNoticiasAgricolas() {
  console.log('Fetching Noticias Agricolas...');
  try {
    const { data } = await axios.get('https://www.noticiasagricolas.com.br/cotacoes/boi-gordo', { timeout: 10000 });
    const $ = cheerio.load(data);
    
    console.log('Searching for CEPEA row...');
    $('tr').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Boi Gordo') && text.includes('Esalq')) {
        console.log(`FOUND ROW ${i}:`, text.replace(/\s+/g, ' ').trim());
        $(el).find('td').each((j, td) => {
          console.log(`  TD ${j}:`, $(td).text().trim());
        });
      }
    });

    console.log('\nSearching for B3 table...');
    $('.cotacoes-detalhes').each((i, el) => {
       console.log(`TABLE ${i} first row:`, $(el).find('tr').first().text().trim());
    });

  } catch (e) {
    console.error('Failed:', e.message);
  }
}

debugNoticiasAgricolas();
