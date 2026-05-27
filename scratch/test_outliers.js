function getMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function detectOutliers(candidates) {
  const categoriesMap = {};
  candidates.forEach(c => {
    const cat = c.offer.category || 'Outros';
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(c);
  });

  const valid = [];
  const rejected = [];

  Object.keys(categoriesMap).forEach(cat => {
    const catCandidates = categoriesMap[cat];
    console.log(`\nProcessando categoria: ${cat} (Total lotes: ${catCandidates.length})`);

    if (catCandidates.length < 3) {
      console.log(`Amostra muito pequena (< 3). Todos aceitos.`);
      valid.push(...catCandidates.map(c => c.offer));
      return;
    }

    const prices = catCandidates.map(c => c.offer.price_kg);
    const medianPrice = getMedian(prices);
    const absoluteDeviations = prices.map(p => Math.abs(p - medianPrice));
    const mad = getMedian(absoluteDeviations);
    const dispersion = Math.max(mad, 0.1 * medianPrice);

    console.log(`  Mediana: ${medianPrice}`);
    console.log(`  MAD: ${mad}`);
    console.log(`  Dispersão (max MAD ou 10% mediana): ${dispersion}`);

    catCandidates.forEach(c => {
      const zScore = (0.6745 * (c.offer.price_kg - medianPrice)) / dispersion;
      const isOutlier = Math.abs(zScore) > 3.5;
      console.log(`    Lote: price_kg=${c.offer.price_kg} -> Z-Score=${zScore.toFixed(4)} ${isOutlier ? '[REJEITADO OUTLIER]' : '[ACEITO]'}`);

      if (isOutlier) {
        rejected.push({
          ...c.original,
          _audit_reason: `Outlier detectado na categoria ${cat} (Z-Score: ${zScore.toFixed(2)}, preço: R$ ${c.offer.price_kg.toFixed(2)}/kg, mediana: R$ ${medianPrice.toFixed(2)}/kg)`
        });
      } else {
        valid.push(c.offer);
      }
    });
  });

  return { valid, rejected };
}

// Dataset de Teste
const mockCandidates = [
  // Categoria Terneiros (com um erro óbvio de OCR de 1.48 e outro de 148.0)
  { offer: { category: 'Terneiros', price_kg: 14.50 }, original: { Animal: 'Terneiros', screenshot: 'img1.png' } },
  { offer: { category: 'Terneiros', price_kg: 14.80 }, original: { Animal: 'Terneiros', screenshot: 'img2.png' } },
  { offer: { category: 'Terneiros', price_kg: 15.20 }, original: { Animal: 'Terneiros', screenshot: 'img3.png' } },
  { offer: { category: 'Terneiros', price_kg: 1.48 }, original: { Animal: 'Terneiros (Erro OCR baixo)', screenshot: 'img_erro_baixo.png' } },
  { offer: { category: 'Terneiros', price_kg: 148.0 }, original: { Animal: 'Terneiros (Erro OCR alto)', screenshot: 'img_erro_alto.png' } },
  
  // Categoria Vacas (com poucos elementos, devem ser aceitos)
  { offer: { category: 'Vacas', price_kg: 10.50 }, original: { Animal: 'Vaca', screenshot: 'img4.png' } },
  { offer: { category: 'Vacas', price_kg: 10.80 }, original: { Animal: 'Vaca', screenshot: 'img5.png' } }
];

const result = detectOutliers(mockCandidates);
console.log('\n--- RESULTADOS FINAIS ---');
console.log('Válidos:', result.valid.length);
console.log('Rejeitados:', JSON.stringify(result.rejected, null, 2));
