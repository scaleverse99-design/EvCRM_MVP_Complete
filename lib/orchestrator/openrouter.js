/**
 * 🤖 OpenRouter AI Client for Free Model Integration
 * Connects to OpenRouter.ai API to stream/generate articles using 100% free models.
 */

const FREE_MODELS = [
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "meta-llama/llama-3-8b-instruct:free"
]

export function isOpenRouterConfigured() {
  return !!process.env.OPENROUTER_API_KEY
}

export async function callOpenRouter(prompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is missing")
  }

  const model = options.model || FREE_MODELS[0]

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://evcrm.in",
        "X-Title": "EvCRM CTE Orchestrator"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a professional Indian automotive journalist and SEO writer for EvCRM.in. Always output clean JSON." },
          { role: "user", content: prompt }
        ],
        temperature: options.temperature || 0.6,
        max_tokens: 2000
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenRouter API error (${res.status}): ${errText}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ""
    return { text: content, modelUsed: model }
  } catch (err) {
    console.warn(`[OpenRouter] Call failed on model ${model}:`, err.message)
    throw err
  }
}
