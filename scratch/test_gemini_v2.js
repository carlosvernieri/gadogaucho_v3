const { GenAI } = require("@google/genai");

async function test() {
  const genAI = new GenAI({
    apiKey: "AIzaSyARd-mHPJRgrmGbf7Rh5nnAjsFsB5rlaMc"
  });

  try {
    // Try to list models as a simple check
    // Actually, let's try to generate a small response if possible
    // Note: the API for @google/genai might be different
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
