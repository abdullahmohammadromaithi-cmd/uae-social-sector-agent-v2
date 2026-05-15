/**
 * Claude API Client
 * Raw fetch calls to Anthropic Messages API.
 * Uses web_search_20250305 tool for live internet access.
 */

const BASE_URL    = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

async function callClaude({ apiKey, model, maxTokens, system, prompt, useSearch = false }) {
  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  };

  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const res = await fetch(BASE_URL, {
    method:  "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000), // 3 min timeout
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  const data = await res.json();
  // Extract all text blocks (web_search responses interleave tool_use blocks)
  return (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n")
    .trim();
}

function parseJSON(raw) {
  let text = raw.trim();
  // Strip markdown fences
  if (text.startsWith("```")) {
    text = text.split("\n").slice(1).join("\n");
    text = text.replace(/```\s*$/, "").trim();
  }
  return JSON.parse(text);
}

module.exports = { callClaude, parseJSON };
