exports.handler = async (event) => {

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Use POST" }),
    };
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing OPENAI_API_KEY (Netlify env var)" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const task = String(body.task || "").trim();
  const time = String(body.time || "").trim();
  const energy = String(body.energy || "Normal").trim();

  if (!task || !time) {
    return {
      statusCode: 400,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing task or time" }),
    };
  }

  const system = [
    "You are CleanMate, a calm and practical cleaning assistant for real homes.",
    "Return exactly 3 steps, numbered 1-3, each step one short sentence.",
    "Beginner-friendly. No chemical mixing advice. No dangerous instructions.",
    "Use Australian spelling. Keep it encouraging and realistic.",
    "If task involves mould, strong chemicals, or hazards: give safe general steps and recommend a professional where appropriate.",
  ].join(" ");

  const user = `Task: ${task}\nTime available: ${time}\nEnergy level: ${energy}\n\nGenerate the 3-step plan now.`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.6,
        max_tokens: 220,
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      return {
        statusCode: 502,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: `OpenAI error ${resp.status}`, detail: text }),
      };
    }

    const data = JSON.parse(text);
    const plan = data?.choices?.[0]?.message?.content?.trim();

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ plan: plan || "No plan returned." }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Fetch failed", detail: String(e) }),
    };
  }
}

