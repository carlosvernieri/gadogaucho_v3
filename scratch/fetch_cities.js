const fs = require('fs');
const https = require('https');

https.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados/RS/municipios', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const municipios = JSON.parse(data);
    const rsCities = municipios.map(m => ({
      name: m.nome,
      lat: null,
      lng: null
    }));
    
    const existingContent = fs.readFileSync('lib/data.ts', 'utf8');
    
    // Simple manual extraction to avoid eval errors
    const existingCities = [];
    const nameRegex = /name:\s*'([^']+)'/g;
    const latRegex = /lat:\s*([0-9.-]+)/g;
    const lngRegex = /lng:\s*([0-9.-]+)/g;
    
    const blocks = existingContent.split('}');
    for (const block of blocks) {
      const nameMatch = /name:\s*'([^']+)'/.exec(block);
      const latMatch = /lat:\s*([0-9.-]+)/.exec(block);
      const lngMatch = /lng:\s*([0-9.-]+)/.exec(block);
      if (nameMatch && latMatch && lngMatch) {
        existingCities.push({
          name: nameMatch[1],
          lat: parseFloat(latMatch[1]),
          lng: parseFloat(lngMatch[1])
        });
      }
    }

    const merged = rsCities.map(m => {
      const found = existingCities.find(c => c.name.toLowerCase() === m.name.toLowerCase());
      if (found) {
        return { name: m.name, lat: found.lat, lng: found.lng };
      }
      return m;
    });

    const categoriesListStr = `export const CATEGORIES_LIST = [
  'Boi Castrado',
  'Gado de Leite',
  'Novilha',
  'Novilho',
  'Terneira',
  'Terneiro',
  'Touro',
  'Vaca',
  'Vaca com Cria',
  'Vaca Prenha'
];`;

    const resultStr = `export const RS_CITIES = [\n` + 
      merged.map(c => `  { name: ${JSON.stringify(c.name)}, lat: ${c.lat}, lng: ${c.lng} }`).join(',\n') +
      `\n];\n\n${categoriesListStr}\n`;
      
    fs.writeFileSync('lib/data.ts', resultStr);
    console.log(`Updated lib/data.ts with ${merged.length} cities`);
  });
}).on('error', (err) => {
  console.error("Error: " + err.message);
});
