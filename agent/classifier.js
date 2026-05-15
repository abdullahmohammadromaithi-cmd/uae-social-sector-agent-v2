/**
 * Step 2 — Classifier & Relevance Scorer
 * Deduplicates, scores UAE relevance 1-10, assigns stream, flags urgency.
 */

const { callClaude, parseJSON } = require("./claude");

const SYSTEM = `You are a senior intelligence analyst for the UAE social sector.
Receive a JSON array of article summaries. For EACH article add four fields:

  "relevance_score" int 1-10:
      9-10 = Directly about UAE OR directly actionable for UAE organisations
      7-8  = GCC/Middle East OR global AI in social sector with clear UAE fit
      5-6  = General social sector / AI trends with some UAE relevance
      1-4  = Peripheral or irrelevant

  "stream" one of:
      "breaking_news"             current events, policy, funding announcements
      "global_ai_implementation"  AI/tech implementations in social sector globally
      "policy_funding_signal"     regulatory changes, funding opportunities, strategy

  "urgent" boolean — true if action needed within 7 days

  "uae_applicability" string — one sentence on UAE relevance

Return ONLY a valid JSON array. No markdown. No preamble.`;

const BATCH = 10;

async function classifyArticles({ articles, apiKey, model, maxTokens, threshold, log }) {
  const deduped = dedup(articles);
  log(`  After dedup: ${deduped.length}`);

  const classified = [];
  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch  = deduped.slice(i, i + BATCH);
    const prompt = `Classify these ${batch.length} articles:\n\n${JSON.stringify(batch, null, 2)}`;
    try {
      const raw    = await callClaude({ apiKey, model, maxTokens, system: SYSTEM, prompt });
      const result = parseJSON(raw);
      if (Array.isArray(result)) classified.push(...result);
      else classified.push(...batch);
    } catch (err) {
      log(`  ⚠ Classify batch error: ${err.message}`);
      classified.push(...batch);
    }
  }

  const filtered = classified
    .filter(a => (a.relevance_score ?? 5) >= threshold)
    .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));

  log(`  Kept ${filtered.length}/${classified.length} (threshold ${threshold})`);
  return filtered;
}

function dedup(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = (a.title || "").slice(0, 60).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { classifyArticles };
