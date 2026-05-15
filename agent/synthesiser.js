/**
 * Step 3 — Trend Synthesiser
 * Produces executive summary, top trends, actions, policy signals.
 */

const { callClaude, parseJSON } = require("./claude");

const SYSTEM = `You are a strategic advisor to UAE social sector leaders and government entities.
You have deep knowledge of UAE Vision 2031, MOHRE, MOFAI, ADDA, Takaful, TAMM, and the GCC landscape.

You will receive today's classified social sector intelligence articles.
Produce a synthesis as a JSON object with EXACTLY these keys:

{
  "executive_summary": "3-4 sentence overview of today's most important developments (string)",

  "top_trends": [
    {
      "trend_title": "short descriptive title",
      "description": "2-3 sentences explaining the trend",
      "global_examples": ["example 1", "example 2"],
      "uae_opportunity": "1-2 sentences on opportunity or risk for UAE specifically"
    }
  ],

  "this_week_actions": [
    {
      "action": "specific concrete action sentence",
      "audience": "who should act e.g. UAE social sector NGOs",
      "urgency": "high | medium | low"
    }
  ],

  "policy_signals": [
    {
      "signal": "description of policy or funding signal",
      "source": "organisation or country",
      "uae_relevance": "why this matters for UAE"
    }
  ],

  "urgent_items": ["list of urgent article titles flagged in the articles"],

  "sentiment": "positive | cautious | mixed | concerning",

  "word_of_the_day": "One Arabic word relevant to today's themes with transliteration and meaning"
}

Return ONLY the JSON object. No preamble. No markdown fences.`;

async function synthesise({ articles, apiKey, model, maxTokens, log }) {
  log("  Synthesising trends");
  const top    = [...articles].sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0)).slice(0, 20);
  const groups = { breaking_news: [], global_ai_implementation: [], policy_funding_signal: [] };
  top.forEach(a => { (groups[a.stream] = groups[a.stream] || []).push(a); });

  const prompt = `Today's classified articles grouped by stream:\n\n${JSON.stringify(groups, null, 2)}\n\nSynthesise the strategic intelligence as instructed.`;

  try {
    const raw    = await callClaude({ apiKey, model, maxTokens, system: SYSTEM, prompt });
    const result = parseJSON(raw);
    if (result && !result._parse_error) return result;
  } catch (err) {
    log(`  ⚠ Synthesis error: ${err.message}`);
  }

  // Fallback
  return {
    executive_summary: `Today's briefing covers ${articles.length} articles across the UAE social sector and global AI landscape.`,
    top_trends:        [],
    this_week_actions: [],
    policy_signals:    [],
    urgent_items:      articles.filter(a => a.urgent).map(a => a.title),
    sentiment:         "mixed",
    word_of_the_day:   "تطوير — Tatweer — Development",
  };
}

module.exports = { synthesise };
