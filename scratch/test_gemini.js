const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const genAI = new GoogleGenerativeAI("AIzaSyARd-mHPJRgrmGbf7Rh5nnAjsFsB5rlaMc");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent("Hello");
    const response = await result.response;
    const text = response.text();
    console.log("Success:", text);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
