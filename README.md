# Prathamesh Dhumal — Portfolio

Production portfolio for Prathamesh Mahendra Dhumal. The site uses a blueprint-and-brass visual system and keeps shipped work, experiments, active builds and future ideas visibly separate.

## Current truth map

| Area | Status | Notes |
| --- | --- | --- |
| DAY 01 — Gulf MCR | SHIPPED | Live 100-Day Challenge demo + public source repository |
| DAY 02 — Tasteology | SHIPPED | Live 100-Day Challenge demo + public source repository |
| DAY 03 — Artista Perfetto | SHIPPED | Live SITEPRO-led challenge build + public source repository |
| DAY 04 — Something More Productive | IN PROGRESS | Nearly complete; deliberately not labelled shipped until final public deployment |
| SITEPRO | ACTIVE CONCEPT | Evolving website-development standard/product idea; not misrepresented as a finished installable plugin |
| NEC Avengers | EXPERIMENT | Personal interaction/motion learning project; not presented as client work |
| Testimonials | NOT PUBLISHED YET | No invented quotes; page waits for real publishable feedback |
| Pricing | NOT FIXED YET | Scope examples only; no invented fixed package prices |
| Blog | NOT PUBLISHED YET | Article slots are clearly marked future content |
| Resources | NOT PUBLISHED YET | Future learning resources; not represented as published material |
| Profile portrait | ASSET TO REPLACE | Uses a clear placeholder until Prathamesh adds his real photograph |
| Project screenshots | ASSETS TO REPLACE | Local editorial covers are used until real browser screenshots are supplied |

The personal Griha Pravesh / home-invitation project remains intentionally excluded from the public portfolio.

## Project carousel

The homepage and Projects page use an accessible horizontal project carousel:

- DAY 01–03 are labelled as shipped builds.
- DAY 04 is labelled IN PROGRESS.
- Personal experiments carry an EXPERIMENT status.
- Arrow buttons, keyboard Left/Right navigation, touch/trackpad scrolling and pagination indicators are supported.
- The homepage surfaces Day 01 through Day 04; the full Projects page also includes personal experiments.
- Project cards receive restrained project-specific accent colors without replacing the main portfolio identity.

## SITEPRO

`sitepro.html` is the portfolio-facing explanation of SITEPRO: a research-first, human-first, production-minded workflow for creating business websites. It explains principles, workflow stages, tool roles and the roadmap while clearly stating that SITEPRO is still an active concept rather than a finished commercial plugin.

## Customize these assets

1. Portrait — replace `assets/images/profile/prathamesh-placeholder.svg` with a real portrait optimized for web.
2. Project screenshots — replace the files in `assets/images/projects/` with strong real browser screenshots. Day 03 and Day 04 currently use intentionally labelled editorial covers rather than fake screenshots.
3. Custom cursor — replace `assets/cursor/cursor-default.svg` and `cursor-hover.svg` only if the replacement improves usability; the current production JavaScript disables the decorative cursor.
4. Resume — `assets/documents/Prathamesh_Dhumal_Resume.pdf`.
5. Content — update `data/site.json` and `data/projects.json`.

## Architecture

- `components/` — shared header/footer
- `css/` — variables, base, layout, components, animations, responsive rules and the SITEPRO upgrade layer
- `js/` — one concern per file plus `portfolio-upgrade.js` for progressive SITEPRO/project enhancements
- `data/` — editable project/profile data
- `assets/` — profile, project artwork, cursor, video and documents

No backend secrets or service-role credentials are stored in the repository.

## Motion and UI

Motion is implemented with first-party/native browser APIs rather than executable third-party animation CDNs. The site includes scroll reveals, clip reveals, staggered content, project image parallax, magnetic desktop CTAs, scroll progress, process-step activation and reduced-motion fallbacks.

## Backend

Contact forms post directly to the Supabase `portfolio_contact_messages` table using a browser-safe publishable key.

Security model:

- Row Level Security is enabled on the contact table.
- Public clients have INSERT-only access required for form submissions.
- Public roles cannot SELECT, UPDATE or DELETE contact submissions.
- Internal status/source fields are protected by database defaults and policy checks.
- Browser validation and anti-spam UX are treated as convenience layers, not a security boundary.
- The frontend has a Content Security Policy, blocks plugin/object execution, restricts network connections to the portfolio origin and the specific Supabase project, and hardens external links.

### Remaining abuse consideration

A public contact endpoint can still receive automated spam from clients that bypass browser JavaScript. Stronger bot/rate-limit protection would require a server/edge layer such as a Supabase Edge Function plus CAPTCHA/rate limiting.

## Supply-chain / threat hardening

- No GSAP/Lenis executable CDN dependency.
- No executable desktop/script binaries are required by the site.
- No `eval()` or `new Function()` usage.
- Project JSON is rendered with DOM `textContent` and validated URLs.
- Content Security Policy allows scripts only from the repository/site origin.

## Local run

Use VS Code Live Server or another local HTTP server. Shared components and JSON data use `fetch()`, so `file://` is not the intended workflow.
