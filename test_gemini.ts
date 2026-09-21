import { GoogleGenAI } from '@google/genai';

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Key present in script:", apiKey ? "YES (length: " + apiKey.length + ")" : "NO");
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY environment variable.");
    return;
  }
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Olá, o que é a ADMIR?',
    });
    console.log("Success! Response text:", res.text);
  } catch (err: any) {
    console.error("Failed to generate content:", err);
    if (err.status) console.log("Status:", err.status);
    if (err.error) console.log("Inner error:", JSON.stringify(err.error));
  }
}

test();
