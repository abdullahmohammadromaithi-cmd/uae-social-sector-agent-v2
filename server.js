/**
 * UAE Social Sector AI Intelligence Agent
 * Express web server — runs on Render, serves the live dashboard
 * and executes the agentic pipeline on demand or on a daily schedule.
 */

const express  = require("express");
const cron     = require("node-cron");
const path     = require("path");
const fs       = require("fs");
const { runAgent } = require("./agent/orchestrator");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── In-memory store (Render free tier has ephemeral disk) ──────────────────
let latestBriefing  = null;
let isRunning       = false;
let lastRunAt       = null;
let lastError       = null;
let runLog          = [];

// ── Static files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ── API routes ───────────────────────────────────────────────────────────────

// GET /api/status — health + last run info
app.get("/api/status", (req, res) => {
  res.json({
    ok:             true,
    isRunning,
    lastRunAt,
    lastError,
    hasBriefing:    !!latestBriefing,
    briefingDate:   latestBriefing?.date || null,
    apiKeySet:      !!process.env.ANTHROPIC_API_KEY,
    model:          process.env.AGENT_MODEL || "claude-sonnet-4-20250514",
  });
});

// GET /api/briefing — return latest briefing JSON
app.get("/api/briefing", (req, res) => {
  if (!latestBriefing) {
    return res.status(404).json({ error: "No briefing yet. Click Run Now to generate one." });
  }
  res.json(latestBriefing);
});

// GET /api/log — last 50 log lines
app.get("/api/log", (req, res) => {
  res.json({ log: runLog.slice(-50) });
});

// POST /api/run — trigger a manual run
app.post("/api/run", async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: "Agent is already running. Please wait." });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: "ANTHROPIC_API_KEY is not set in environment variables." });
  }
  // Respond immediately — run in background
  res.json({ ok: true, message: "Agent started. Refresh in 2–4 minutes." });
  _runAgent();
});

// ── Scheduler — daily at 07:00 UAE (GMT+4 = 03:00 UTC) ─────────────────────
cron.schedule("0 3 * * *", () => {
  if (!isRunning && process.env.ANTHROPIC_API_KEY) {
    _log("⏰ Scheduled daily run triggered");
    _runAgent();
  }
});

// ── Agent runner ─────────────────────────────────────────────────────────────
async function _runAgent() {
  isRunning  = true;
  lastError  = null;
  runLog     = [];
  _log("🚀 Agent pipeline started");

  try {
    const briefing = await runAgent({
      apiKey:    process.env.ANTHROPIC_API_KEY,
      model:     process.env.AGENT_MODEL     || "claude-sonnet-4-20250514",
      maxTokens: parseInt(process.env.AGENT_MAX_TOKENS || "4096"),
      nIdeas:    parseInt(process.env.N_IDEAS           || "5"),
      threshold: parseInt(process.env.RELEVANCE_THRESHOLD || "5"),
      log:       _log,
    });
    latestBriefing = briefing;
    lastRunAt      = new Date().toISOString();
    _log(`✅ Done — ${briefing.stats.scored_articles} articles, ${briefing.stats.ideas_generated} ideas`);
  } catch (err) {
    lastError = err.message;
    _log(`❌ Error: ${err.message}`);
    console.error(err);
  } finally {
    isRunning = false;
  }
}

function _log(msg) {
  const entry = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  runLog.push(entry);
  console.log(entry);
}

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ UAE Social Sector AI Agent running on port ${PORT}`);
  console.log(`   API key set: ${!!process.env.ANTHROPIC_API_KEY}`);
  console.log(`   Daily schedule: 07:00 UAE (03:00 UTC)`);
});
