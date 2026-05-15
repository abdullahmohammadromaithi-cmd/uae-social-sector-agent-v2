/**
 * Step 4 — UAE Implementation Idea Generator
 * Generates concrete AI pilot ideas tailored to UAE context.
 */

const { callClaude, parseJSON } = require("./claude");

const SYSTEM = `You are an AI strategy consultant specialising in the UAE social sector.
You understand UAE deeply:
- UAE Vision 2031 and National Agenda for Social Development
- Key platforms: TAMM (Abu Dhabi), Takaful (social protection), MOHRE (labour ministry)
- Regulatory environment: UAE PDPL 2022, HAAD (health authority), TRA
- Demographics: ~88% expatriate population, large South Asian migrant worker community
- Strategic partners: MBZUAI (Arabic AI research), Hub71, Mohamed Bin Rashid Innovation Fund
- Islamic social finance: Zakat, Waqf, Sadaqah — significant in UAE philanthropy
- Existing gaps: Arabic NLP quality, siloed government data, limited NGO tech capacity

Based on today's intelligence, generate {N_IDEAS} concrete AI implementation ideas
for UAE social sector organisations — INSPIRED by today's global trends but ADAPTED to UAE.

Return a JSON array. Each element:
{
  "id": "IDEA-001",
  "title": "concise project title",
  "problem_statement": "2 sentences — what problem does this solve in UAE?",
  "ai_approach": "2-3 sentences — what AI technique, which data sources, what Claude API features",
  "target_beneficiaries": "who benefits directly",
  "uae_partners": ["specific UAE organisations to approach"],
  "regulatory_notes": "key compliance — PDPL, HAAD, MOHRE etc.",
  "timeline_estimate": "e.g. 6-9 months pilot",
  "investment_range": "e.g. AED 500K - 1.2M",
  "quick_start_action": "single most important first step to take this week",
  "inspired_by": "which global example or today's trend inspired this",
  "impact_potential": "high | medium",
  "difficulty": "low | medium | high"
}

Return ONLY the JSON array. No preamble. No markdown.`;

async function generateIdeas({ synthesis, articles, nIdeas, apiKey, model, maxTokens, log }) {
  log("  Generating UAE implementation ideas");

  const system = SYSTEM.replace("{N_IDEAS}", nIdeas);
  const topArticles = articles.slice(0, 12).map(a => ({
    title:   a.title,
    summary: a.summary,
    cluster: a.cluster,
  }));

  const prompt = [
    `Today's top trends:\n${JSON.stringify(synthesis.top_trends || [], null, 2)}`,
    `\nTop articles:\n${JSON.stringify(topArticles, null, 2)}`,
    `\nGenerate ${nIdeas} UAE-specific AI implementation ideas inspired by these signals.`,
  ].join("");

  try {
    const raw    = await callClaude({ apiKey, model, maxTokens, system, prompt });
    const result = parseJSON(raw);
    if (Array.isArray(result)) return result;
    if (result && typeof result === "object") {
      for (const v of Object.values(result)) {
        if (Array.isArray(v)) return v;
      }
    }
  } catch (err) {
    log(`  ⚠ Idea generation error: ${err.message}`);
  }
  return [];
}

module.exports = { generateIdeas };
