#!/usr/bin/env node

/**
 * sharpen v2 - Two-mode prompt translator
 *
 * --clean   Step 1: Strip voice slop, reconstruct into coherent sentences
 * --meta    Step 2: Add role, output format, constraints (metaprompt wrapper)
 * --copy    Copy result to clipboard (mac)
 * --raw     Output text only, no formatting (good for piping)
 *
 * Typical usage:
 *   pbpaste | sharpen --clean           # clean up superwhisper output
 *   pbpaste | sharpen --meta            # add prompt structure to typed prompt
 *   pbpaste | sharpen --clean | sharpen --meta --copy   # full pipeline
 */

const https = require("https");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PREFS_PATH = path.join(process.env.HOME || "", ".claude", "sharpen-prefs.md");

const PROMPTS = {
  clean: `You are a transcription cleaner. Your input is raw voice-to-text output — rambling, with filler words, repeated ideas, and incomplete sentences. Your job is to reconstruct the actual intent into clean, readable prose.

Rules:
1. Strip all voice filler: "um", "uh", "like", "you know", "kind of", "sort of", "basically", "maybe", "or whatever", "I mean", "right"
2. Merge repeated or rephrased versions of the same idea into one clear statement
3. Fix sentence structure — voice-to-text often produces run-ons or fragments
4. Preserve ALL technical terms, proper nouns, product names, variable names verbatim
5. Preserve intent exactly — never add ideas that weren't there
6. Output should read like the person typed it carefully, not like they spoke it
7. Keep it concise — if they said the same thing three ways, pick the clearest one

Output format:
CLEANED: [the cleaned text]

NOTE: [one sentence on the biggest cleanup made]`,

  meta: `You are a prompt engineer. Your input is a coherent task description. Your job is to wrap it in proper prompt structure so an LLM produces the best possible output.

Rules:
1. Add a role/persona if helpful: "You are a [relevant expert]..."
2. Restate the task clearly and specifically
3. Add output format instructions: length, structure, tone, format (list vs prose vs code, etc.)
4. Add constraints: what to avoid, what to prioritize, edge cases to handle
5. If the task involves code: specify language, style, whether to include comments/tests
6. Keep it tight — no padding, no "please", no "could you"
7. Preserve the original intent exactly — only add structure, never change the ask

Output format:
OPTIMIZED: [the full metaprompt]

NOTE: [one sentence on the most important structural addition made]`
};

function callAnthropicAPI(text, mode) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      reject(new Error("ANTHROPIC_API_KEY environment variable not set"));
      return;
    }

    let prefs = "";
    try { prefs = fs.readFileSync(PREFS_PATH, "utf8").trim(); } catch (e) {}
    const prefsBlock = prefs ? `\n\nUser preferences (apply these rules):\n${prefs}` : "";
    const systemPrompt = PROMPTS[mode] + prefsBlock;
    const userMessage = mode === "clean"
      ? `Clean up this voice transcription:\n\n${text}`
      : `Add prompt structure to this task description:\n\n${text}`;

    const body = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed.content[0].text);
        } catch (e) {
          reject(new Error("Failed to parse API response: " + data));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

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

function formatOutput(apiResponse, mode, rawMode) {
  const { result, note } = parseResponse(apiResponse, mode);

  if (rawMode) return result;

  const label = mode === "clean" ? "✦ CLEANED" : "✦ OPTIMIZED";
  const sep = "─".repeat(60);

  let output = `\n${sep}\n${label}\n${sep}\n\n${result}\n\n`;
  if (note) output += `${sep}\n${note}\n`;
  output += sep;

  return output;
}

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

async function main() {
  const args = process.argv.slice(2);

  const cleanMode = args.includes("--clean");
  const metaMode = args.includes("--meta");
  const rawMode = args.includes("--raw");
  const copyMode = args.includes("--copy");

  if (!cleanMode && !metaMode) {
    process.stderr.write("Usage: sharpen --clean | --meta [--copy] [--raw] [\"prompt\"]\n");
    process.stderr.write("  --clean   Strip voice filler, reconstruct into coherent text\n");
    process.stderr.write("  --meta    Add role, output format, and constraints (metaprompt)\n");
    process.exit(1);
  }

  const mode = cleanMode ? "clean" : "meta";
  const cleanArgs = args.filter(a => !a.startsWith("--"));
  const input = await getInput(cleanArgs);

  if (!input) {
    process.stderr.write("Error: No input provided\n");
    process.exit(1);
  }

  if (!rawMode) process.stderr.write(`${mode === "clean" ? "Cleaning" : "Optimizing"}...\n`);

  try {
    const response = await callAnthropicAPI(input, mode);
    const formatted = formatOutput(response, mode, rawMode);
    process.stdout.write(formatted + "\n");

    if (copyMode) {
      const { result } = parseResponse(response, mode);
      try {
        execSync(`echo ${JSON.stringify(result)} | pbcopy`);
        process.stderr.write("✓ Copied to clipboard\n");
      } catch (e) {
        process.stderr.write("(pbcopy not available)\n");
      }
    }
  } catch (err) {
    process.stderr.write("Error: " + err.message + "\n");
    process.exit(1);
  }
}

main();
