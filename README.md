# Corvit Professional Student Assistant Demo

A static HTML/CSS/JavaScript Corvit-style dummy website with a single bottom-right AI chatbot.

## Files

- `index.html` — website UI and one chatbot dialog
- `style.css` — complete responsive professional styling
- `tailwind.css` — local Tailwind-compatible utility layer; styling is kept in normal CSS so Live Preview renders without a build step
- `script.js` — dataset retrieval, chatbot UI, localStorage history, deterministic fallback, Groq GPT-OSS-120B integration and live Corvit search
- `dataset.json` — structured Corvit knowledge base
- `api-key.txt` — local development Groq key (DO NOT deploy/commit)
- `netlify/functions/corvit-search.js` — same-origin live search proxy restricted to official Corvit pages
- `netlify.toml` — Netlify function/build configuration

## Local Antigravity setup

Use an HTTP Live Preview/server. Do **not** open `index.html` with `file://`, because `fetch("dataset.json")` and `fetch("api-key.txt")` need HTTP.

Put your development Groq key in:

```text
api-key.txt
```

The chatbot uses:

```text
openai/gpt-oss-120b
```

## Online search

The chatbot has an **Enable online search** switch.

When enabled (or when a question looks time-sensitive), JavaScript calls:

```text
/.netlify/functions/corvit-search
```

The Netlify function fetches a curated set of official `corvit.com` pages, scores them against the question, and returns the most relevant text.

This is deliberately constrained to Corvit's official website rather than searching the whole internet.

## Production security

Do not deploy `api-key.txt` publicly. A browser-based static site cannot keep a Groq API key secret.

For production, move the Groq request into a Netlify Function and store the key as a Netlify environment variable.

## Chatbot logic

```text
Question
   ↓
Intent detection
   ↓
Structured dataset retrieval
   ↓
Exact/deterministic answer if available
   ↓
Optional live official Corvit search
   ↓
GPT-OSS-120B receives only relevant context
   ↓
If model fails → deterministic dataset fallback
   ↓
If information is missing → official-source verification message
```

The bot also supports image responses from official Corvit-hosted media records.
