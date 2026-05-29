const fs = require('fs');
const https = require('https');

https.get('https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const cleanedData = data.replace(/^\uFEFF/, '');
      const municipios = JSON.parse(cleanedData);
      // Filter RS cities (codigo_uf = 43)
      const rsCitiesRaw = municipios.filter(m => m.codigo_uf === 43);
      
      const rsCities = rsCitiesRaw.map(m => ({
        name: m.nome,
        lat: m.latitude,
        lng: m.longitude
      }));

      // Sort alphabetically
      rsCities.sort((a, b) => a.name.localeCompare(b.name));

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
        rsCities.map(c => `  { name: ${JSON.stringify(c.name)}, lat: ${c.lat}, lng: ${c.lng} }`).join(',\n') +
        `\n];\n\n${categoriesListStr}\n`;
        
      fs.writeFileSync('lib/data.ts', resultStr);
      console.log(`Successfully written ${rsCities.length} RS cities with coordinates to lib/data.ts`);
    } catch (e) {
      console.error('Error parsing or writing:', e);
    }
  });
}).on('error', (err) => {
  console.error("Error fetching: ", err.message);
});
