
const { scrapeCepea, scrapeScot, fetchB3Futures, saveMarketData } = require('./lib/market-scraper');

async function testFinalSync() {
  console.log('--- Iniciando Teste de Sincronização Final ---');
  
  try {
    const cepea = await scrapeCepea();
    console.log('CEPEA:', cepea ? 'OK (' + cepea.price + ')' : 'FALHOU');
    
    const scot = await scrapeScot();
    console.log('Scot:', scot ? 'OK' : 'FALHOU');
    
    const b3 = await fetchB3Futures();
    console.log('B3:', b3 ? 'OK (' + b3.length + ' contratos)' : 'FALHOU');
    
    if (cepea || scot || b3) {
      const success = await saveMarketData({ cepea, scot, b3 });
      console.log('Salvamento em JSON:', success ? 'SUCESSO' : 'FALHA');
    }
    
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

testFinalSync();
