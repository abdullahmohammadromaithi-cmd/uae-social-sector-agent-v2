/**
 * Step 1 — News Collector
 * One Claude + web_search call per cluster.
 * Returns flat array of article objects.
 */

const { callClaude, parseJSON } = require("./claude");
const { SEARCH_CLUSTERS }       = require("./keywords");

const SYSTEM = `You are a specialist research analyst for UAE social sector intelligence.
Search for recent news and articles (prefer last 60 days) matching the given queries.

For each article found return a JSON array where every element has EXACTLY these keys:
  "title"        — article headline (string)
  "source"       — publication name (string)
  "date"         — publication date YYYY-MM-DD or "unknown" (string)
  "url"          — full article URL (string)
  "summary"      — 3-5 factual sentences summarising the article (string)
  "cluster"      — the cluster label given in the prompt (string)
  "key_entities" — up to 5 orgs, countries or technologies mentioned (array of strings)

Return ONLY a valid JSON array. No markdown fences. No preamble. No trailing text.`;

async function collectNews({ apiKey, model, maxTokens, log }) {
  const allArticles = [];

  for (const [cluster, queries] of Object.entries(SEARCH_CLUSTERS)) {
    log(`  Searching: ${cluster}`);
    const queryBlock = queries.map(q => `  - ${q}`).join("\n");
    const prompt = `Cluster: "${cluster}"\n\nQueries:\n${queryBlock}\n\nReturn up to 8 high-quality distinct articles as a JSON array.`;

    try {
      const raw      = await callClaude({ apiKey, model, maxTokens, system: SYSTEM, prompt, useSearch: true });
      const articles = safeParseList(raw);
      articles.forEach(a => { a.cluster = cluster; });
      allArticles.push(...articles);
      log(`    → ${articles.length} articles`);
    } catch (err) {
      log(`    ⚠ ${cluster} failed: ${err.message}`);
    }
  }

  log(`  Total collected: ${allArticles.length}`);
  return allArticles;
}

function safeParseList(raw) {
  try {
    const parsed = parseJSON(raw);
    if (Array.isArray(parsed)) return parsed.filter(a => a && typeof a === "object");
    if (parsed && typeof parsed === "object") {
      for (const v of Object.values(parsed)) {
        if (Array.isArray(v)) return v.filter(a => a && typeof a === "object");
      }
    }
  } catch (_) {}
  return [];
}

module.exports = { collectNews };
