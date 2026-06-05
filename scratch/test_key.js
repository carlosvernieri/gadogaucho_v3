const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// Parse .env.local manually to get the key
const envPath = path.join(__dirname, '../.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && match[1] === 'GEMINI_API_KEY') {
      apiKey = (match[2] || '').trim();
      if (apiKey.charAt(0) === '"' && apiKey.charAt(apiKey.length - 1) === '"') {
        apiKey = apiKey.substring(1, apiKey.length - 1);
      }
    }
  });
}

console.log('Chave encontrada:', apiKey ? `Sim (comprimento: ${apiKey.length})` : 'Não');

if (!apiKey) {
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });

async function run() {
  console.log('Enviando requisição de teste para o Gemini...');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Olá! Diga apenas "Chave ativa!"'
    });
    console.log('Resposta:', response.text);
  } catch (err) {
    console.error('Erro detalhado:', err);
  }
}

run();
