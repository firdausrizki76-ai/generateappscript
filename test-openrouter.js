
require('dotenv').config({ path: '.env.local' });

async function test() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log("Key exists:", !!apiKey);
  
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",
      messages: [{role: "user", content: "Hello!"}],
      response_format: { type: "json_object" }
    })
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

test();
