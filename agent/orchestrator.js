const { collectNews }      = require("./collector");
const { classifyArticles } = require("./classifier");
const { synthesise }       = require("./synthesiser");
const { generateIdeas }    = require("./ideagenerator");

async function runAgent({ apiKey, model, maxTokens, nIdeas, threshold, log }) {
  const start = Date.now();
  const date  = new Date().toISOString().slice(0, 10);

  log("Step 1 - Collecting news");
  const rawArticles = await collectNews({ apiKey, model, maxTokens, log });

  log("Step 2 - Classifying articles");
  const articles = await classifyArticles({ articles: rawArticles, apiKey, model, maxTokens, threshold, log });

  log("Step 3 - Synthesising trends");
  const synthesis = await synthesise({ articles, apiKey, model, maxTokens, log });

  log("Step 4 - Generating UAE ideas");
  const ideas = await generateIdeas({ synthesis, articles, nIdeas, apiKey, model, maxTokens, log });
  log("Generated " + ideas.length + " ideas");

  return {
    date,
    generated_at:    new Date().toISOString(),
    elapsed_seconds: Math.round((Date.now() - start) / 1000),
    model,
    stats: {
      raw_articles:    rawArticles.length,
      scored_articles: articles.length,
      ideas_generated: ideas.length,
    },
    synthesis,
    ideas,
    articles,
  };
}

module.exports = { runAgent };
