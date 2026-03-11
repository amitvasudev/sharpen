---
description: Sharpens a big task into a precise prompt with a subagent execution plan. Decomposes research/discovery into parallel subagents to keep the main thread lean and avoid context compaction. Takes $ARGUMENTS as the raw prompt. If no arguments given, operates on the most recent message.
---

## Preferences

Before sharpening, read `~/.claude/sharpen-prefs.md` if it exists. Apply every rule.

## Input

The raw prompt is: $ARGUMENTS

## What this does

This is `/sharpen` for big tasks. It does two things:
1. Sharpens the raw prompt into a clear task (same rules as `/sharpen`)
2. Adds a **subagent execution plan** — decomposing the research/discovery phase into parallel Agent tool calls that run before the main work begins

The goal: keep the main conversation thread lean by offloading information gathering to subagents. Their results come back as compact summaries, not 30 tool calls polluting the main context.

## Sharpening rules

Same as `/sharpen`:
1. Strip filler (um, like, kind of, basically, you know)
2. Preserve intent — never change what's being asked, only how it's expressed
3. Add specificity — replace vague words with concrete references
4. Preserve technical terms exactly
5. No fluff — direct and imperative for tasks

## Subagent decomposition

After sharpening the task, analyze what information is needed before execution can begin. Choose from these research patterns (use ONLY the ones relevant to this specific task — never include all of them):

- **File discovery**: Find files matching patterns, locate relevant modules, map directory structure
- **State gathering**: Read SESSION_CONTEXT.md, check git status, read config files, check environment
- **Code review**: Read and summarize specific files, understand existing patterns/conventions, find how something is currently implemented
- **Dependency analysis**: Check what's imported, what versions are used, what APIs are available
- **API/schema inspection**: Read API docs, check endpoint signatures, review database schemas
- **Test discovery**: Find existing tests, understand test patterns, check what's covered
- **Search/grep**: Find usages of a function, find all places a pattern appears, locate where something is defined

Rules for decomposition:
- Each subagent gets ONE focused research task — not a grab bag
- Subagents that don't depend on each other MUST be marked as parallel
- If a subagent's output is needed by another, mark the dependency explicitly
- Every subagent must write its findings to a scratch file (`/tmp/<task-slug>-<agent-name>.md`) so results survive compaction
- Keep it to 2-5 subagents. If you need more, the task should probably be broken into separate tasks entirely
- Subagents are research-only — they read, search, and summarize. They do NOT edit or write project files.

## Output format

Output the sharpened prompt in a code block, structured exactly like this:

````
```
## Task
[The sharpened task description — what needs to be built/done]

## Phase 1: Research (parallel subagents)

Write all findings to /tmp/<task-slug>-research.md as you go.

### Agent 1: [descriptive name]
[Specific research task. What to look for, where to look, what to report back.]

### Agent 2: [descriptive name]
[Specific research task.]

### Agent 3: [descriptive name] (depends on Agent 1)
[Specific research task. Note the dependency.]

## Phase 2: Execute
Once all research agents have reported back, read /tmp/<task-slug>-research.md to load their findings. Then:
1. [First concrete step]
2. [Second concrete step]
3. [...]

Before starting Phase 2, update SESSION_CONTEXT.md (if it exists) with research findings and execution plan.
```
````

Then, on a new line:
- **Note:** one-line explanation of the key decomposition decision (why these specific subagents)
- **Estimated context savings:** rough sense of how much research is offloaded vs done inline

Then ask: "Does this look right, or should I adjust the subagent plan?" — wait for approval before executing.

## Learning from corrections

If the user edits or corrects the subagent plan, extract the lesson and append it to `~/.claude/sharpen-prefs.md`. Format: `- ` prefix per rule. Don't duplicate existing rules.

## Example

Raw: "I need to add 8sleep data ingestion to the health platform, pull from their API, store it in the same DB pattern as oura, make sure it filters to my side of the bed"

Sharpened:
```
## Task
Add 8sleep data ingestion to the health platform. Pull data from the 8sleep API, store it in SQLite following the same pattern as the existing Oura ingestion, and filter to Amit's side of the bed (shared bed).

## Phase 1: Research (parallel subagents)

Write all findings to /tmp/8sleep-ingestion-research.md as you go.

### Agent 1: Oura pattern review
Read `ingest/oura_sync.py` and `db/health_db.py`. Document: how Oura data is fetched, transformed, and stored. Note the DB schema, table naming, and any sync state tracking (last sync timestamp, dedup logic). Output a concise summary of the pattern to replicate.

### Agent 2: 8sleep API discovery
Search the codebase for any existing 8sleep references. Check `config.json` and `.env` for 8sleep credentials. Research the 8sleep API: what endpoints exist, what auth is needed, what the response format looks like, and which fields identify bed side (left vs right).

### Agent 3: DB schema check
Read the current SQLite schema (check `db/health_db.py` for table definitions). List all existing tables and their columns. Note any patterns for how new data sources are added (migrations, schema versioning, etc.).

## Phase 2: Execute
Once all research agents have reported back, read /tmp/8sleep-ingestion-research.md. Then:
1. Add 8sleep config to `config.json` (API base URL, side-of-bed setting)
2. Create `ingest/eightsleep_sync.py` following the exact pattern from oura_sync.py
3. Add 8sleep tables to `db/health_db.py` matching existing schema conventions
4. Filter all data to configured bed side before storage
5. Test the sync manually

Before starting Phase 2, update SESSION_CONTEXT.md with research findings and execution plan.
```

Note: Split into 3 parallel research agents — Oura pattern (what to replicate), 8sleep API (what we're working with), and DB schema (where it goes). All independent, all read-only.

Estimated context savings: ~15-20 tool calls of file reads and searches offloaded from main thread.

Does this look right, or should I adjust the subagent plan?
