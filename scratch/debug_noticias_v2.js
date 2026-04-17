
const axios = require('axios');
const cheerio = require('cheerio');

async function debugNoticiasAgricolas() {
  console.log('Fetching Noticias Agricolas...');
  try {
    const res = await axios.get('https://www.noticiasagricolas.com.br/cotacoes/boi-gordo', { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000 
    });
    console.log('Status:', res.status);
    console.log('HTML Length:', res.data.length);

    if (res.data.length < 1000) {
       console.log('Response body too short, might be blocked.');
       // console.log(res.data);
    }

    const $ = cheerio.load(res.data);
    console.log('Page Title:', $('title').text());

    console.log('Searching for any TR content...');
    $('tr').slice(0, 5).each((i, el) => {
       console.log(`ROW ${i}:`, $(el).text().replace(/\s+/g, ' ').trim().substring(0, 100));
    });

  } catch (e) {
    console.error('Failed:', e.message);
    if (e.response) console.log('Response Status:', e.response.status);
  }
}

debugNoticiasAgricolas();
