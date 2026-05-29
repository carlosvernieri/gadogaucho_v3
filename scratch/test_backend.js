const fs = require('fs');
const path = require('path');

const folders = [
  'leilao_santa_ursula_2026_05_01_3',
  'leilao_santa_ursula_2026_05_28_23',
  'leilao_santa_ursula_2026_05_27_22',
  'leilao_guaiba_2026_05_28_25',
  'leilao_guaiba_2026_05_27_24',
  'leilao_butia_2026_05_27_21',
  'leilao_butia_2026_05_13_20'
];

let totalLots = 0;
let totalRejected = 0;

console.log('BALANÇO DE EXTRAÇÃO OCR PÓS-OTIMIZAÇÃO:\n');
console.log(
  '| Leilão (Pasta) | Lotes Totais | Rejeitados Restantes | Sucesso (%) |'
);
console.log(
  '| :--- | :---: | :---: | :---: |'
);

folders.forEach(folder => {
  const folderPath = path.join(__dirname, '../auction_ocr_poc/outputs', folder);
  const resultJsonPath = path.join(folderPath, 'process_result.json');
  const auditJsonPath = path.join(folderPath, 'audit_rejected.json');
  
  if (!fs.existsSync(resultJsonPath)) return;
  
  const offers = JSON.parse(fs.readFileSync(resultJsonPath, 'utf8'));
  let rejectedCount = 0;
  if (fs.existsSync(auditJsonPath)) {
    const rejected = JSON.parse(fs.readFileSync(auditJsonPath, 'utf8'));
    rejectedCount = rejected.length;
  }
  
  const successRate = (((offers.length - rejectedCount) / offers.length) * 100).toFixed(1);
  
  console.log(
    `| ${folder} | ${offers.length} | ${rejectedCount} | ${successRate}% |`
  );
  
  totalLots += offers.length;
  totalRejected += rejectedCount;
});

const overallSuccessRate = (((totalLots - totalRejected) / totalLots) * 100).toFixed(1);
console.log('\n=== RESUMO GERAL ===');
console.log(`Total de Lotes Analisados: ${totalLots}`);
console.log(`Total de Rejeições Restantes: ${totalRejected} (apenas ${((totalRejected/totalLots)*100).toFixed(1)}% do total)`);
console.log(`Total de Lotes Válidos (Inseridos): ${totalLots - totalRejected}`);
console.log(`Taxa de Sucesso Geral da Ferramenta: ${overallSuccessRate}%`);
