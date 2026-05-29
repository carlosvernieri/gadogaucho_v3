const fs = require('fs');
const path = require('path');

const outputsDir = path.join(__dirname, '../auction_ocr_poc/outputs');
const folders = [
  'leilao_santa_ursula_2026_05_01_3',
  'leilao_santa_ursula_2026_05_28_23',
  'leilao_guaiba_2026_05_28_25',
  'leilao_butia_2026_05_13_20'
];

const extractWeight = (text) => {
  const normalized = text.toUpperCase();
  const match = normalized.match(/\b([0-9OILI|BSZG]+)\s*(?:KG|K9|K|G)\b/i);
  if (match) {
    let rawWeight = match[1];
    let cleanWeight = rawWeight
      .replace(/[O]/g, '0')
      .replace(/[IL|]/g, '1')
      .replace(/[B]/g, '8')
      .replace(/[S]/g, '5')
      .replace(/[Z]/g, '2')
      .replace(/[G]/g, '6');
    
    const parsed = parseInt(cleanWeight, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
};

let grandTotalOriginalRejected = 0;
let grandTotalNewRejected = 0;
let grandTotalLots = 0;

folders.forEach(folder => {
  const folderPath = path.join(outputsDir, folder);
  const resultJsonPath = path.join(folderPath, 'process_result.json');
  const auditJsonPath = path.join(folderPath, 'audit_rejected.json');
  
  if (!fs.existsSync(resultJsonPath)) return;
  
  const offers = JSON.parse(fs.readFileSync(resultJsonPath, 'utf8'));
  let originalRejected = [];
  if (fs.existsSync(auditJsonPath)) {
    originalRejected = JSON.parse(fs.readFileSync(auditJsonPath, 'utf8'));
  }
  
  let newRejected = [];
  offers.forEach(o => {
    let price = parseFloat((o.Preço || '').replace('.', '').replace(',', '.')) || 0;
    let price_kg = parseFloat((o.Média || '').replace(',', '.')) || 0;
    let avg_weight = extractWeight(o.Animal || '');
    
    // Mathematical recovery logic
    if (avg_weight === 0 && price > 0 && price_kg > 0) {
      const recovered = Math.round(price / price_kg);
      if (recovered >= 30 && recovered <= 1000) {
        avg_weight = recovered;
      }
    } else if (price === 0 && avg_weight > 0 && price_kg > 0) {
      const recovered = Math.round(price_kg * avg_weight);
      if (recovered >= 100 && recovered <= 30000) {
        price = recovered;
      }
    } else if (price_kg === 0 && price > 0 && avg_weight > 0) {
      const recovered = Math.round((price / avg_weight) * 100) / 100;
      if (recovered >= 3.0 && recovered <= 100.0) {
        price_kg = recovered;
      }
    }
    
    // Rejection validation
    if (avg_weight === 0 || price === 0 || price_kg === 0) {
      newRejected.push({
        lote: o.Lote,
        animal: o.Animal,
        price,
        price_kg,
        avg_weight
      });
    }
  });
  
  console.log(`Leilão: ${folder}`);
  console.log(`  Total Lotes: ${offers.length}`);
  console.log(`  Rejeitados Originalmente: ${originalRejected.length}`);
  console.log(`  Rejeitados com Novo Algoritmo: ${newRejected.length}`);
  console.log('---');
  
  grandTotalLots += offers.length;
  grandTotalOriginalRejected += originalRejected.length;
  grandTotalNewRejected += newRejected.length;
});

console.log('=== RESUMO GLOBAL ===');
console.log(`Total Geral de Lotes: ${grandTotalLots}`);
console.log(`Total Rejeitado Originalmente: ${grandTotalOriginalRejected} (${((grandTotalOriginalRejected/grandTotalLots)*100).toFixed(1)}%)`);
console.log(`Total Rejeitado no Novo Algoritmo: ${grandTotalNewRejected} (${((grandTotalNewRejected/grandTotalLots)*100).toFixed(1)}%)`);
console.log(`Melhoria Absoluta: Recobramos ${grandTotalOriginalRejected - grandTotalNewRejected} lotes que seriam descartados!`);
