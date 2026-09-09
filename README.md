# Prathamesh Dhumal — Portfolio

Production portfolio for Prathamesh Mahendra Dhumal. The site uses a blueprint-and-brass visual system and keeps shipped work, experiments, planned content and undecided items visibly separate.

## Current truth map

| Area | Status | Notes |
| --- | --- | --- |
| DAY 01 — Gulf MCR | SHIPPED | Live 100-Day Challenge demo + public source repository |
| DAY 02 — Tasteology | SHIPPED | Live 100-Day Challenge demo + public source repository |
| NEC Avengers | EXPERIMENT | Personal interaction/motion learning project; not presented as client work |
| DAY 03+ | COMING AS BUILT | Not shown as completed until a real build exists |
| Testimonials | NOT PUBLISHED YET | No invented quotes; page explicitly waits for real publishable feedback |
| Pricing | NOT FIXED YET | Scope examples only; no invented fixed package prices |
| Blog | NOT PUBLISHED YET | Article slots are clearly marked future content |
| Resources | NOT PUBLISHED YET | Future learning resources; not represented as published material |
| Profile portrait | ASSET TO REPLACE | Uses a clear placeholder until Prathamesh adds his real photograph |
| Project screenshots | ASSETS TO REPLACE | Local placeholder artwork is used until real screenshots are supplied |

The personal Griha Pravesh / home-invitation project has intentionally been removed from this public portfolio and from project data/assets.

## Project carousel

The homepage and Projects page use an accessible horizontal project carousel:

- DAY 01 and DAY 02 are labelled as shipped builds.
- Personal experiments carry an EXPERIMENT status.
- Arrow buttons, keyboard Left/Right navigation, touch/trackpad scrolling and pagination indicators are supported.
- The carousel is responsive and becomes a full-width single-card interaction on mobile.

## Customize these assets

1. Portrait — replace `assets/images/profile/prathamesh-placeholder.svg`.
2. Project screenshots — replace files in `assets/images/projects/` and update `data/projects.json` if filenames change.
3. Custom cursor — replace `assets/cursor/cursor-default.svg` and `cursor-hover.svg`.
4. Resume — `assets/documents/Prathamesh_Dhumal_Resume.pdf`.
5. Content — update `data/site.json` and `data/projects.json`.

## Architecture

- `components/` — shared header/footer
- `css/` — variables, base, layout, components, animations and responsive rules
- `js/` — one concern per file
- `data/` — editable project/profile data
- `assets/` — profile, project artwork, cursor, video and documents

No backend code, secrets or service-role credentials are stored in the repository.

## Motion and UI

Motion is implemented with first-party/native browser APIs rather than executable third-party animation CDNs. The site includes scroll reveals, clip reveals, staggered content, project image parallax, magnetic desktop CTAs, scroll progress, custom cursor support, process-step activation and reduced-motion fallbacks.

## Backend

Contact forms post directly to the Supabase `portfolio_contact_messages` table using a browser-safe publishable key.

Security model:

- Row Level Security is enabled and forced on the contact table.
- `anon` and `authenticated` roles have INSERT access only to the six form-input columns: `name`, `email`, `subject`, `message`, `project_type`, `budget`.
- Public roles cannot SELECT, UPDATE or DELETE contact submissions.
- Public roles cannot set internal `status` or `source` fields.
- Server-side RLS checks restrict required field lengths and enforce internal default status/source values.
- Browser validation, a honeypot and minimum interaction time reduce low-effort spam but are not treated as a security boundary.
- The frontend has a Content Security Policy, blocks plugin/object execution, restricts network connections to the portfolio origin and the specific Supabase project, and uses hardened external links.

### Remaining abuse consideration

A public contact endpoint can still receive automated spam from clients that bypass browser JavaScript. Stronger bot/rate-limit protection would require a server/edge layer (for example a Supabase Edge Function plus CAPTCHA/rate limiting). This is not misrepresented as solved by the frontend honeypot.

## Supply-chain / threat hardening

- Removed GSAP and Lenis CDN scripts; animations now run from local first-party JavaScript.
- No executable files (`.exe`, `.dll`, `.bat`, `.cmd`, `.ps1`, `.jar`, etc.) are part of the site.
- No `eval()` or `new Function()` usage.
- Project JSON is rendered with DOM `textContent`/validated URLs rather than trusting JSON as executable HTML.
- Content Security Policy allows scripts only from this repository/site origin.
- The included resume PDF contains an embedded Content Credentials attachment from its document-generation pipeline; it is not executed by the site. Keep the resume source trusted when replacing it.

## Local run

Use VS Code Live Server or another local HTTP server. Shared components and JSON data use `fetch()`, so `file://` is not the intended workflow.
