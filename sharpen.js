#!/usr/bin/env node

/**
 * sharpen v3 - Multi-provider prompt translator (local-first)
 *
 * Modes:
 *   --clean   Strip voice slop, reconstruct into coherent sentences
 *   --meta    Add role, output format, constraints (metaprompt wrapper)
 *   --copy    Copy result to clipboard (mac)
 *   --raw     Output text only, no formatting (good for piping)
 *   --model <name>   Override model (see MODELS registry below)
 *
 * Model selection (in priority order):
 *   1. --model <name> CLI flag
 *   2. SHARPEN_MODEL env var
 *   3. Default: "qwen" (local Ollama)
 *
 * On local model failure, auto-falls back to "haiku" (cloud) with a stderr warning.
 *
 * Typical usage:
 *   pbpaste | sharpen --clean
 *   pbpaste | sharpen --meta --copy
 *   SHARPEN_MODEL=sonnet pbpaste | sharpen --meta
 *   sharpen --clean --model haiku "some text"
 */

const https = require("https");
const http = require("http");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PREFS_PATH = path.join(process.env.HOME || "", ".claude", "sharpen-prefs.md");

// =====================================================================
// MODEL REGISTRY — add new models here, no other code changes needed
// =====================================================================
const MODELS = {
  // Local (free, private, fast) — use Ollama native API to control "think" mode
  // keep_alive "1h" prevents model unload after default 5min idle → no cold starts during a working session
  qwen:    { provider: "ollama",        model: "qwen3:8b",       endpoint: "http://localhost:11434", think: false, keepAlive: "1h" },
  qwen4:   { provider: "ollama",        model: "qwen3:4b",       endpoint: "http://localhost:11434", think: false, keepAlive: "1h" },
  qwen14:  { provider: "ollama",        model: "qwen3:14b",      endpoint: "http://localhost:11434", think: false, keepAlive: "1h" },
  qwenThink: { provider: "ollama",      model: "qwen3:8b",       endpoint: "http://localhost:11434", think: true,  keepAlive: "1h" },
  llama:   { provider: "ollama",        model: "llama3.1:8b",    endpoint: "http://localhost:11434", keepAlive: "1h" },

  // Anthropic cloud
  haiku:   { provider: "anthropic",     model: "claude-haiku-4-5-20251001" },
  sonnet:  { provider: "anthropic",     model: "claude-sonnet-4-6" },
  opus:    { provider: "anthropic",     model: "claude-opus-4-7" },

  // OpenRouter (if user later wants DeepSeek/Qwen-cloud)
  // deepseek: { provider: "openai-compat", model: "deepseek/deepseek-chat", endpoint: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY" },
};

const DEFAULT_MODEL = "haiku";
const FALLBACK_MODEL = "haiku";

// Per-mode defaults — overridden by --model or SHARPEN_MODEL
// Default is Haiku for both modes: best structured-output quality at trivial cost.
// Local Qwen 3 8B is available via --model qwen for cases where you want $0/private
// (good for --clean, weaker than Haiku for --meta).
const DEFAULT_MODEL_BY_MODE = {
  clean: "haiku",
  meta:  "haiku"
};

// =====================================================================
// PROMPTS
// =====================================================================
const PROMPTS = {
  clean: `You are a transcription cleaner. Your input is raw voice-to-text output — rambling, with filler words, repeated ideas, and incomplete sentences. Your job is to reconstruct the actual intent into clean, readable prose.

Rules:
1. Preserve the speech act type. If the speaker is asking a question, the output must be a question. If they're thinking aloud or exploring options, keep it exploratory. If they're approving a prior plan, keep it as approval with any caveats. NEVER turn a question into a command, a musing into a directive, or an approval into a new task.
2. Strip pure voice filler: "um", "uh", "like", "you know", "sort of", "or whatever", "I mean", "right". But preserve hedges that signal uncertainty ("I think", "probably", "not sure", "maybe") — reword them cleanly but keep the uncertainty intact.
3. Merge repeated or rephrased versions of the same idea into one clear statement
4. Fix sentence structure — voice-to-text often produces run-ons or fragments
5. Preserve ALL technical terms, proper nouns, product names, variable names verbatim
6. Preserve intent exactly — never add ideas that weren't there
7. Output should read like the person typed it carefully, not like they spoke it
8. Keep it concise — if they said the same thing three ways, pick the clearest one
9. Preserve emphasis and urgency. If the speaker says something is critical, urgent, "not even close to ready", or uses strong language to signal importance, carry that intensity into the output — don't neutralize it.
10. Keep secondary mentions of tools, platforms, or alternatives even if stated in passing (e.g. "maybe Notion or Pages"). These define scope boundaries and future intent.

Output format:
CLEANED: [the cleaned text]

NOTE: [one sentence on the biggest cleanup made]`,

  meta: `You are a prompt engineer. Your input is a coherent description — it might be a task, a question, an approval, or exploratory thinking. Your job is to add prompt structure so an LLM produces the best possible output.

Rules:
1. FIRST: classify the intent type. Is this a TASK (do something), QUESTION (asking for advice/opinion), APPROVAL (green-lighting a plan, possibly with caveats), or DISCUSSION (thinking aloud, exploring options)? Your structured output MUST match this type. A question stays a question. An approval stays an approval with constraints highlighted. NEVER convert a question or discussion into an imperative command.
2. Add a role/persona if helpful: "You are a [relevant expert]..."
3. Restate the intent clearly and specifically — preserving its type from rule 1
4. Add output format instructions: length, structure, tone, format (list vs prose vs code, etc.)
5. Add constraints: what to avoid, what to prioritize, edge cases to handle
6. If the task involves code: specify language, style, whether to include comments/tests
7. Keep it tight — no padding, no "please", no "could you" (but questions should still read as questions)
8. Preserve the original intent exactly — only add structure, never change the ask
9. Preserve emphasis and urgency. If the input says something is critical, not ready, or uses strong language to signal priority, keep that intensity in the structured output.

Output format:
OPTIMIZED: [the full metaprompt]

NOTE: [one sentence on the most important structural addition made]`
};

// =====================================================================
// PROVIDERS
// =====================================================================

function callAnthropic(systemPrompt, userMessage, modelConfig) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      reject(new Error("ANTHROPIC_API_KEY not set"));
      return;
    }

    const body = JSON.stringify({
      model: modelConfig.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    });

    const req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(body)
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed.content[0].text);
        } catch (e) {
          reject(new Error("Anthropic parse failed: " + data));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function callOllama(systemPrompt, userMessage, modelConfig) {
  return new Promise((resolve, reject) => {
    const base = modelConfig.endpoint.replace(/\/$/, "");
    const url = new URL(base + "/api/chat");

    const payload = {
      model: modelConfig.model,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      options: {
        num_predict: 1024
      }
    };
    if (modelConfig.think !== undefined) payload.think = modelConfig.think;
    if (modelConfig.keepAlive) payload.keep_alive = modelConfig.keepAlive;
    const body = JSON.stringify(payload);

    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;

    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      },
      timeout: 120000
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error));
          else if (!parsed.message || !parsed.message.content) reject(new Error("No content in response: " + data.slice(0, 300)));
          else resolve(parsed.message.content);
        } catch (e) {
          reject(new Error("Ollama parse failed: " + data.slice(0, 300)));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(Object.assign(new Error("Request timed out"), { code: "ETIMEDOUT" })); });
    req.write(body);
    req.end();
  });
}

function callOpenAICompat(systemPrompt, userMessage, modelConfig) {
  return new Promise((resolve, reject) => {
    const base = modelConfig.endpoint.replace(/\/$/, "");
    const url = new URL(base + "/chat/completions");
    const apiKey = modelConfig.keyEnv ? process.env[modelConfig.keyEnv] : "ollama-local";
    if (modelConfig.keyEnv && !apiKey) {
      reject(new Error(`${modelConfig.keyEnv} not set`));
      return;
    }

    const body = JSON.stringify({
      model: modelConfig.model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ]
    });

    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;

    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(body)
      },
      timeout: 60000
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          else if (!parsed.choices || !parsed.choices[0]) reject(new Error("No choices in response: " + data));
          else resolve(parsed.choices[0].message.content);
        } catch (e) {
          reject(new Error("OpenAI-compat parse failed: " + data));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("Request timed out")); });
    req.write(body);
    req.end();
  });
}

async function callModel(modelName, systemPrompt, userMessage) {
  const cfg = MODELS[modelName];
  if (!cfg) throw new Error(`Unknown model: ${modelName}. Available: ${Object.keys(MODELS).join(", ")}`);

  const finalSystem = cfg.systemSuffix ? systemPrompt + cfg.systemSuffix : systemPrompt;

  if (cfg.provider === "anthropic") return callAnthropic(finalSystem, userMessage, cfg);
  if (cfg.provider === "ollama") return callOllama(finalSystem, userMessage, cfg);
  if (cfg.provider === "openai-compat") return callOpenAICompat(finalSystem, userMessage, cfg);
  throw new Error(`Unknown provider: ${cfg.provider}`);
}

// Local model failure detection — these errors mean "fall back to cloud"
function isLocalConnectionError(err) {
  const code = err && err.code ? String(err.code) : "";
  const msg = String((err && err.message) || err || "");
  return /^(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH)$/.test(code)
      || /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|timed out|fetch failed/i.test(msg);
}

async function callWithFallback(primaryModel, systemPrompt, userMessage) {
  const cfg = MODELS[primaryModel];
  const isLocal = cfg && (cfg.provider === "ollama" || (cfg.provider === "openai-compat" && cfg.endpoint && cfg.endpoint.includes("localhost")));

  try {
    return { text: await callModel(primaryModel, systemPrompt, userMessage), modelUsed: primaryModel };
  } catch (err) {
    if (isLocal && isLocalConnectionError(err) && primaryModel !== FALLBACK_MODEL) {
      const reason = err.code || err.message || "connection failed";
      process.stderr.write(`⚠ Local model (${primaryModel}) unreachable: ${reason}\n`);
      process.stderr.write(`⚠ Falling back to ${FALLBACK_MODEL} (cloud)\n`);
      return { text: await callModel(FALLBACK_MODEL, systemPrompt, userMessage), modelUsed: FALLBACK_MODEL };
    }
    throw err;
  }
}

// =====================================================================
// OUTPUT FORMATTING
// =====================================================================

function parseResponse(apiResponse, mode) {
  const lines = apiResponse.trim().split("\n");
  const tag = mode === "clean" ? "CLEANED:" : "OPTIMIZED:";

  const resultIdx = lines.findIndex(l => l.startsWith(tag));
  const noteIdx = lines.findIndex(l => l.startsWith("NOTE:"));

  if (resultIdx === -1) return { result: apiResponse.trim(), note: null };

  const firstLine = lines[resultIdx].replace(tag, "").trim();
  const bodyLines = lines.slice(resultIdx + 1, noteIdx === -1 ? undefined : noteIdx).filter(l => l.trim() !== "");
  const result = firstLine ? [firstLine, ...bodyLines].join("\n").trim() : bodyLines.join("\n").trim();
  const note = noteIdx !== -1 ? lines[noteIdx] : null;

  return { result, note };
}

function formatOutput(apiResponse, mode, rawMode, modelUsed) {
  const { result, note } = parseResponse(apiResponse, mode);

  if (rawMode) return result;

  const label = mode === "clean" ? "✦ CLEANED" : "✦ OPTIMIZED";
  const sep = "─".repeat(60);

  let output = `\n${sep}\n${label}  (${modelUsed})\n${sep}\n\n${result}\n\n`;
  if (note) output += `${sep}\n${note}\n`;
  output += sep;

  return output;
}

// =====================================================================
// INPUT
// =====================================================================

async function getInput(cleanArgs) {
  if (cleanArgs.length > 0) return cleanArgs.join(" ");

  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data.trim()));
    });
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    process.stderr.write("Enter text (Ctrl+D to finish):\n> ");
    let data = "";
    rl.on("line", (line) => { data += line + " "; });
    rl.on("close", () => resolve(data.trim()));
  });
}

// =====================================================================
// MAIN
// =====================================================================

function getModelChoice(args, mode) {
  const idx = args.indexOf("--model");
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  if (process.env.SHARPEN_MODEL) return process.env.SHARPEN_MODEL;
  if (mode && DEFAULT_MODEL_BY_MODE[mode]) return DEFAULT_MODEL_BY_MODE[mode];
  return DEFAULT_MODEL;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list-models")) {
    process.stdout.write("Available models:\n");
    for (const [name, cfg] of Object.entries(MODELS)) {
      const loc = (cfg.provider === "ollama" || (cfg.provider === "openai-compat" && cfg.endpoint && cfg.endpoint.includes("localhost"))) ? "local" : "cloud";
      process.stdout.write(`  ${name.padEnd(10)} ${cfg.model.padEnd(35)} (${loc})\n`);
    }
    process.stdout.write(`\nDefault: ${DEFAULT_MODEL}\nFallback (on local failure): ${FALLBACK_MODEL}\n`);
    process.exit(0);
  }

  const cleanMode = args.includes("--clean");
  const metaMode = args.includes("--meta");
  const rawMode = args.includes("--raw");
  const copyMode = args.includes("--copy");

  if (!cleanMode && !metaMode) {
    process.stderr.write("Usage: sharpen --clean | --meta [--copy] [--raw] [--model <name>] [\"prompt\"]\n");
    process.stderr.write("  --clean         Strip voice filler, reconstruct into coherent text\n");
    process.stderr.write("  --meta          Add role, output format, and constraints (metaprompt)\n");
    process.stderr.write("  --model <name>  Override model (see --list-models)\n");
    process.stderr.write("  --list-models   Show available models and exit\n");
    process.exit(1);
  }

  const mode = cleanMode ? "clean" : "meta";
  const modelChoice = getModelChoice(args, mode);
  if (!MODELS[modelChoice]) {
    process.stderr.write(`Error: unknown model "${modelChoice}". Run: sharpen --list-models\n`);
    process.exit(1);
  }

  // Strip flag values from positional args
  const cleanArgs = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--model") { i++; continue; }
    if (a.startsWith("--")) continue;
    cleanArgs.push(a);
  }

  const input = await getInput(cleanArgs);
  if (!input) {
    process.stderr.write("Error: No input provided\n");
    process.exit(1);
  }

  // Build system prompt with prefs
  let prefs = "";
  try { prefs = fs.readFileSync(PREFS_PATH, "utf8").trim(); } catch (e) {}
  const prefsBlock = prefs ? `\n\nUser preferences (apply these rules):\n${prefs}` : "";
  const systemPrompt = PROMPTS[mode] + prefsBlock;
  const userMessage = mode === "clean"
    ? `Clean up this voice transcription:\n\n${input}`
    : `Add prompt structure to this task description:\n\n${input}`;

  if (!rawMode) process.stderr.write(`${mode === "clean" ? "Cleaning" : "Optimizing"} via ${modelChoice}...\n`);

  try {
    const { text, modelUsed } = await callWithFallback(modelChoice, systemPrompt, userMessage);
    const formatted = formatOutput(text, mode, rawMode, modelUsed);
    process.stdout.write(formatted + "\n");

    if (copyMode) {
      const { result } = parseResponse(text, mode);
      try {
        execSync(`echo ${JSON.stringify(result)} | pbcopy`);
        process.stderr.write("✓ Copied to clipboard\n");
      } catch (e) {
        process.stderr.write("(pbcopy not available)\n");
      }
    }
  } catch (err) {
    const msg = err.message || err.code || String(err) || "unknown error";
    process.stderr.write("Error: " + msg + "\n");
    process.exit(1);
  }
}

main();
