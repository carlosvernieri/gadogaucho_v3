import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function run() {
  console.log("Calling Gemini 3.5 Flash...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Olá! Diga apenas "Funcionou!"',
    });
    console.log('Result:', response.text);
  } catch (err: any) {
    console.error('Error:', err.message || err);
  }
}

run();
