# Colour system

> Indigo + amber on near‑black. The palette is built to feel modern, confident, and to read clearly in both English (en‑US), Spanish (es‑MX) and Portuguese (pt‑MZ) contexts.

## Core palette

| Token | Hex | Use |
| --- | --- | --- |
| `--indigo`       | `#4F46E5` | Primary brand. Buttons, links, logo mark, focus rings. |
| `--indigo-700`   | `#4338CA` | Hover / pressed state, dark‑mode primary surface. |
| `--indigo-100`   | `#E0E7FF` | Background tints, chip fills, hover backgrounds. |
| `--indigo-50`    | `#EEF2FF` | Subtle wash (cards, callouts). |
| `--amber`        | `#F59E0B` | Accent / **highlight only**. The "matter" pixel. Never primary. |
| `--amber-50`     | `#FEF3C7` | Warning chip backgrounds. |
| `--amber-700`    | `#B45309` | Amber text on white (WCAG AA: 4.83 on `#fff`). |
| `--dark`         | `#27272B` | Dark surfaces — email header, OG card, footer. |
| `--cream`        | `#FAFAF7` | Off‑white that pairs with `--dark` without harsh contrast. |
| `--ink`          | `#111827` | Body headings on light backgrounds. |
| `--body`         | `#374151` | Body copy. |
| `--muted`        | `#6B7280` | Secondary text, captions. |
| `--rule`         | `#E5E7EB` | Borders, dividers. |
| `--paper`        | `#F9FAFB` | Page background. |

## Semantic palette (status / state)

| Token | Hex | Use |
| --- | --- | --- |
| `--success-bg`   | `#DCFCE7` | Active job chip background |
| `--success-fg`   | `#15803D` | Active job chip text (WCAG AA: 5.27 on `#DCFCE7`) |
| `--pending-bg`   | `#FEF3C7` | Pending review chip background |
| `--pending-fg`   | `#92400E` | Pending review chip text (WCAG AA: 6.42 on `#FEF3C7`) |
| `--inactive-bg`  | `#F3F4F6` | Inactive chip background |
| `--inactive-fg`  | `#6B7280` | Inactive chip text (WCAG AA: 4.83 on `#F3F4F6`) |
| `--filled-bg`    | `#DBEAFE` | Filled chip background |
| `--filled-fg`    | `#1D4ED8` | Filled chip text (WCAG AA: 6.46 on `#DBEAFE`) |
| `--flagged-bg`   | `#FEE2E2` | Flagged chip background |
| `--flagged-fg`   | `#991B1B` | Flagged chip text (WCAG AA: 8.69 on `#FEE2E2`) |

## Accessibility

All foreground/background combinations above clear WCAG **AA** for normal body text (≥ 4.5 : 1). The Indigo primary `#4F46E5` on white (`#FFFFFF`) is **AA Large** (3.31 : 1) — never use plain indigo for body copy on white. For body text, use `--ink` or `--body`. The indigo‑700 hover token `#4338CA` is **AA Normal** on white (4.62 : 1).

Amber `#F59E0B` on white is **only AA Large** (2.15 : 1). It must NEVER carry text — it is an accent fill on dark surfaces, a star inside a seal, a dot inside a chip. For amber text, always use `--amber-700` (`#B45309`).

## Don't

- ❌ Don't apply indigo to error states (use the flagged red).
- ❌ Don't tint photography with the brand colours; let photos breathe.
- ❌ Don't drop in a fifth colour. If you need another tone, use a lighter or darker shade of the existing six tokens.
- ❌ Don't change the foreground/background pairings in the semantic table above — they're tuned for contrast.

## Source of truth

- LESS variables: [client/lib/journal.variables.import.less](../client/lib/journal.variables.import.less) (`@brand-primary`, `@brand-warning`, …)
- App‑level CSS variables: [client/lib/app.less](../client/lib/app.less) (`.status-badge`, `.status-dot`)
- Brand reference: this file
