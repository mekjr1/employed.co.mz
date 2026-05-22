# Typography

> Two families. One does the heavy lifting, one steals the spotlight.

| Family | Role | Weights used | Source |
| --- | --- | --- | --- |
| **Inter** | Body, UI, captions | 400, 500, 600, 700, 800 | [Google Fonts](https://fonts.google.com/specimen/Inter) |
| **Montserrat** | Display, wordmark, marketing headers, badges in CAPS | 700, 800, 900 | [Google Fonts](https://fonts.google.com/specimen/Montserrat) |

## Wordmark spec

The "Employ**ed**" wordmark is Montserrat **900**, letter‑spacing `-0.02em`, with the trailing "ed" rendered in `--amber` (`#F59E0B`).

```html
<span class="wordmark">
  Employ<span class="ed">ed</span>
</span>
```

```css
.wordmark { font-family: 'Montserrat', sans-serif; font-weight: 900; letter-spacing: -0.02em; color: var(--ink); }
.wordmark .ed { color: var(--amber); }
```

On dark surfaces, replace `var(--ink)` with `var(--cream)` (`#FAFAF7`).

## Type scale (web)

| Token | px | Use |
| --- | --- | --- |
| `display`  | 48 | Hero title (home) |
| `h1`       | 32 | Page title |
| `h2`       | 24 | Section header |
| `h3`       | 18 | Card title, sidebar header |
| `body`     | 15 | Default copy |
| `small`    | 13 | Captions, sidebar meta |
| `micro`    | 11 | Pill labels, breadcrumbs |

Line‑height: 1.15 for display, 1.3 for h1–h3, 1.55 for body.

## Loading

Fonts are loaded once, at the top of [client/views/main.html](../client/views/main.html):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
```

`display=swap` is intentional — we never block paint on a font network round‑trip. Fallbacks via `font-family: 'Inter', system-ui, sans-serif;`.

## Fallback stacks

- **Inter:** `'Inter', system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Montserrat:** `'Montserrat', "Trebuchet MS", "Lucida Sans", sans-serif`

## Don't

- ❌ Don't introduce a third typeface for "fun" sections.
- ❌ Don't render the wordmark in any colour besides ink + amber (or cream + amber on dark).
- ❌ Don't underline the wordmark.
- ❌ Don't condense or stretch the wordmark — use the SVG in `brand/logo/wordmark.svg` for any size > 24px.
