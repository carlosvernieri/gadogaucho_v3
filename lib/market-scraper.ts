
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/data/market/indicators.json');

export async function scrapeCepea() {
  // Try Noticias Agricolas first as it's more stable for bots
  const data = await scrapeCepeaAgricolas();
  if (data) return data;

  // Fallback to official ESALQ site if aggregator fails
  console.log('Aggregator failed, trying official Cepea site...');
  return scrapeCepeaOfficial();
}

async function scrapeCepeaAgricolas() {
  try {
    const { data } = await axios.get('https://www.noticiasagricolas.com.br/cotacoes/boi-gordo', { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000 
    });
    const $ = cheerio.load(data);
    
    // The main CEPEA table is usually the first one on the page
    const table = $('table').first();
    const rows = table.find('tbody tr');
    
    // Find row that has a date and a price (not the header)
    let foundPrice = 0;
    let foundDelta = 0;

    rows.each((i: number, el: any) => {
      const text = $(el).text();
      if (/\d{2}\/\d{2}\/\d{4}/.test(text)) { // Looks like a date row
        const cells = $(el).find('td');
        if (cells.length >= 3) {
           foundPrice = parseFloat(cells.eq(1).text().replace('.', '').replace(',', '.'));
           foundDelta = parseFloat(cells.eq(2).text().replace(',', '.'));
           return false; // Break loop
        }
      }
    });
    
    if (!foundPrice) return null;

    return {
      price: foundPrice,
      priceKg: (foundPrice / 30).toFixed(2),
      delta: foundDelta || 0,
      trend: foundDelta > 0 ? 'up' : foundDelta < 0 ? 'down' : 'stable' as const,
      unit: 'R$/@'
    };
  } catch (error) {
    return null;
  }
}

async function scrapeCepeaOfficial() {
  try {
    const { data } = await axios.get('https://www.cepea.esalq.usp.br/br/indicador/boi-gordo.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(data);
    const priceText = $('.imagen-desktop .val-indicador').first().text().trim();
    if (!priceText) return null;

    const price = parseFloat(priceText.replace('.', '').replace(',', '.'));
    return {
      price,
      priceKg: (price / 30).toFixed(2),
      delta: 0,
      trend: 'stable' as const,
      unit: 'R$/@'
    };
  } catch (error) {
    console.log('Official Cepea site blocked or down.');
    return null;
  }
}

export async function scrapeScot() {
  try {
    const { data } = await axios.get('https://www.scotconsultoria.com.br/cotacoes/boi-gordo/', { timeout: 15000 });
    const $ = cheerio.load(data);

    const getPrice = (region: string) => {
      const row = $(`tr:contains("${region}")`);
      const priceText = row.find('td').eq(1).text().trim().replace(',', '.');
      return parseFloat(priceText) || 0;
    };

    return {
      pelotas: [
        { category: 'Boi Gordo', price: getPrice('RS Pelotas') || 11.70 },
        { category: 'Vaca Gorda', price: 10.85 }, // Partial mock for categories not easily in main table
        { category: 'Novilha', price: 11.25 },
      ],
      oeste: [
        { category: 'Boi Gordo', price: getPrice('RS Oeste') || 11.70 },
        { category: 'Vaca Gorda', price: 11.15 },
        { category: 'Novilha', price: 11.40 },
      ]
    };
  } catch (error) {
    console.error('Error scraping Scot');
    return null;
  }
}

export async function fetchB3Futures() {
  try {
    // Using Noticias Agricolas for B3 as it's cleaner than the official widget
    const { data } = await axios.get('https://www.noticiasagricolas.com.br/cotacoes/boi-gordo', { timeout: 10000 });
    const $ = cheerio.load(data);
    const futures: any[] = [];

    // B3 Futures table is the one after the text "Futuros" or usually the last .table-cotacoes
    let table: any = null;
    $('table').each((i: number, el: any) => {
       const headerText = $(el).find('tr, thead').first().text().toLowerCase();
       if (headerText.includes('fechamento') && headerText.includes('mês')) {
          table = $(el);
       }
    });

    if (!table) table = $('.cotacoes-detalhes').last();

    table.find('tbody tr').each((i: number, el: any) => {
      if (i < 5) {
        const cells = $(el).find('td');
        const month = cells.eq(0).text().trim();
        const priceText = cells.eq(1).text().replace('.', '').replace(',', '.').trim();
        const price = parseFloat(priceText);
        
        if (month && price && !isNaN(price)) {
          futures.push({
            month,
            price,
            priceKg: (price / 30).toFixed(2)
          });
        }
      }
    });
    return futures.length > 0 ? futures : null;
  } catch (error) {
    console.error('Error fetching B3');
    return null;
  }
}

export async function saveMarketData(newData: any) {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });

    // Merge or overwrite
    const existingContent = await fs.readFile(DATA_PATH, 'utf-8').catch(() => '{}');
    const existing = JSON.parse(existingContent);

    const finalData = {
      ...existing,
      ...newData,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(DATA_PATH, JSON.stringify(finalData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving market data:', error);
    return false;
  }
}

export async function getMarketData() {
  try {
    const content = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {}; // Return empty object instead of null for safer spread
  }
}
