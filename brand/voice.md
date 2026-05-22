# Voice & tone

> Direct. Local. No corporate filler.

Employed runs in **Mozambique** (Portuguese) and **Mexico** (Spanish), with English as a fallback. Everything we ship has to read like a real person from those places typed it.

## Voice principles

1. **Short sentences win.** If a sentence runs longer than 20 words, break it.
2. **Active voice, present tense.** "Post a job" not "A job can be posted."
3. **No marketing fluff.** Avoid "unleash", "supercharge", "world‑class", "next‑generation". We are a local job board, not a Series B SaaS.
4. **Numbers over adjectives.** "Goes live in under a minute" beats "blazingly fast".
5. **Speak to the reader.** "Your listing" not "The user's listing".

## Tone by surface

| Surface | Tone |
| --- | --- |
| Marketing pages (home) | Confident, plain, action‑first. |
| Job posting form | Patient, instructive. "Add a salary range — listings with salary get 2× more views." |
| Admin moderation | Procedural, neutral. No emoji. |
| Transactional email | Warm, brief, signed off by "The Employed team". |
| Status messages | Neutral and clear. "Posted. Now waiting for review." |
| Errors | Specific. "Can't post — your email isn't verified yet." Not: "Something went wrong." |

## Multilingual notes

The product is shipped via the in‑repo `t()` helper in `both/lib/i18n.js`. Every string lives in three languages:

- **English (`en`)** — fallback / international
- **Spanish (`es`)** — Mexico market, Mexican Spanish (NOT Castilian)
- **Portuguese (`pt`)** — Mozambique market, Brazilian Portuguese with Mozambican spelling preferences

When adding a new string, write all three at once. Never ship an English‑only feature.

**Spanish (es‑MX):**
- Use "tú" not "usted" (informal — we're not a bank).
- "Empleo" / "trabajo" interchangeably depending on flow.
- Currency: MXN, written as `$1,500 MXN`.

**Portuguese (pt‑MZ):**
- "Emprego" / "vaga" interchangeably.
- Use "você" not "tu".
- Currency: MZN, written as `1.500 MZN`.

## Wordmark in copy

When you write "Employed" in body copy:

- ✅ "Welcome to Employed."
- ✅ "Post your job on Employed."
- ❌ "Welcome to **EMPLOYED**."
- ❌ "Welcome to Employ*ed*." (no italicised "ed" — that's only the visual mark)
- ❌ "Welcome to employed." (always capitalised)

## Don't

- ❌ Don't use exclamation marks in transactional emails ("Welcome!" → "Welcome.").
- ❌ Don't use emoji in admin / moderation copy.
- ❌ Don't translate proper nouns. "Stripe" stays "Stripe", "WhatsApp" stays "WhatsApp".
- ❌ Don't capitalise titles in Spanish/Portuguese the way English does. "Post a job" → "Publicar emprego" (not "Publicar Emprego").
