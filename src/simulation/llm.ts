// ─── LLM Integration (Socratic Gate Proxy) ──────────────────────────────
// Uses Anthropic API (via local proxy to avoid CORS) to generate dialogue.
// API key stored in sessionStorage only — evaporates on tab close (no persistent XSS risk).

export interface LLMConfig {
  apiKey: string;
  provider: 'anthropic' | 'ollama'; // Extendable
  model: string;
}

export function getLLMConfig(): LLMConfig | null {
  const stored = sessionStorage.getItem('cascade_llm_config');
  if (stored) {
    try {
      return JSON.parse(stored) as LLMConfig;
    } catch {
      return null;
    }
  }
  return null;
}

export function saveLLMConfig(config: LLMConfig | null): void {
  if (config) {
    sessionStorage.setItem('cascade_llm_config', JSON.stringify(config));
  } else {
    sessionStorage.removeItem('cascade_llm_config');
  }
}

/**
 * Fetches narrative dialogue from an LLM. 
 * Falls back to throwing an error if API fails (so caller can use templates).
 */
export async function fetchNarrative(prompt: string, config: LLMConfig): Promise<string> {
  if (config.provider === 'anthropic') {
    // We use the Vite proxy '/api/anthropic'
    const res = await fetch('/api/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        // Optional: 'anthropic-dangerously-allow-browser': 'true' if calling directly,
        // but we're routing through proxy so we don't strictly need it, though sometimes it helps if Origin header leaks.
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.7,
        system: "You are an NPC in a historical simulation game. Keep your responses concise (1-2 short paragraphs). Do not break character.",
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API Error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    return data.content[0].text;
  }
  
  throw new Error(`Unsupported provider: ${config.provider}`);
}
