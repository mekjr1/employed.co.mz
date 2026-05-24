# Employed — Job board for Mozambique & Mexico

Mozambique has no dedicated job board, so job seekers rely on Facebook groups, WhatsApp chains, and word of mouth. Mexico has established global platforms like Indeed and LinkedIn, but SMB employers often find them expensive, generic, and English-first. Across both markets, there is room for a local-first, mobile-friendly job board built around regional needs and regional payment rails.

Employed is a localized job board where companies post jobs, candidates browse opportunities, and admins moderate listings for quality. From day one it is designed for both Mozambique and Mexico, with local payment support through M-Pesa, e-Mola, and Stripe, plus market-specific browsing through localized subdomains.

## How it works

1. Employers create job listings, choosing between free basic posts and paid featured posts. Featured listings are paid with Stripe in Mexico and with M-Pesa or e-Mola in Mozambique, while admin approval helps prevent spam and scams.
2. Job seekers browse by category, location, and market on localized experiences such as mz.employed.co.mz and mx.employed.co.mz. No account is required to browse jobs.
3. Listings auto-expire after 90 days to keep the marketplace fresh, while RSS and JSON feeds support syndication and reCAPTCHA v3 reduces automated abuse.

## Market

Mozambique has a population of roughly 33 million, around 2 million formal sector jobs, and effectively zero dedicated job board brand. Mexico offers a much larger SMB recruitment market but remains underserved by expensive, global, English-first platforms. Employed can differentiate through local language support, mobile usability, moderation, and local checkout options.

## Business model

Basic listings are free. Featured listings are priced at roughly $25–50 per post in Mexico, with MZN-equivalent pricing via mobile money in Mozambique. Employer subscriptions for unlimited featured listings range from $99–199 per month. The model becomes self-sustaining at around 100 paid featured listings per month, giving a clear line of sight to break-even.

## Traction (today)

The product already runs in Docker Compose, includes 88 test files, has CI/CD in place, and has UAT evidence with screenshots. Stripe, M-Pesa, and e-Mola payment plumbing are wired, health endpoints exist, and the operational layer already includes structured logging and Sentry. This is a launch execution problem, not a greenfield build.

### What we’ve built

- Subdomain-localized job board for MZ and MX
- Admin approval workflow for spam prevention
- Featured listings with Stripe, M-Pesa, and e-Mola payments
- 90-day auto-expiration
- RSS and JSON feeds
- reCAPTCHA v3 abuse prevention
- SEO-optimized localized metadata
- PT, ES, and EN language support
- Health endpoints, Sentry, and structured logging
- 88 test files and CI/CD pipeline

### What’s next (6 months)

- Deploy to UAT on Box A
- Reach 100 paid featured listings per month
- Partner with 5 Maputo recruitment agencies
- Launch MX market with 3 SMB employers
- Integrate Pagos for unified payment processing

## Team

Abdul Meque — Founder. Full-stack engineer and serial builder. Runs XIBOX, LDA (XiboCloud) in Mozambique.

## Ask

[TBD] Bootstrap-friendly. Target is to become revenue-funded at roughly 100 paid featured listings per month, with fundraising only if expansion into new geographies or employer SaaS accelerates.

## Contact

- Email: abdul@xibodev.com
- Demo: https://employed.xibodev.com (pending)
