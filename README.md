# Prathamesh Dhumal — Portfolio

Production portfolio for Prathamesh Mahendra Dhumal. The site uses a blueprint-and-brass visual system and keeps shipped work, experiments, active builds and future ideas visibly separate.

## Explore the work

- [Live portfolio](https://patu-art.github.io/Portfolio/) · [Projects](https://patu-art.github.io/Portfolio/projects.html) · [100-Day Challenge](https://patu-art.github.io/Portfolio/challenge.html)
- [Professional GitHub profile README — prepared for publication](PROFILE_README.md)
- [Day 04 — Moor Coffee](https://github.com/Patu-art/Day-4) · [Day 05 — Something More Productive](https://github.com/Patu-art/day-5) · [Day 14 — Strange Brew](https://github.com/Patu-art/Day-14)

This portfolio is a personal project and a record of independent website concepts. The business demos are not official client work or endorsements by the featured businesses. SITEPRO is an evolving working method/product concept, not a released plugin.

## Project status and content notes

The [project data](data/projects.json) supplies the public portfolio project cards; check it when adding new work rather than relying on an older snapshot in this README. The deployed challenge repositories extend beyond the first six days. The site's hard-coded challenge progress text and project catalogue may not yet reflect all later builds, and should be checked before presenting an exact total.

Portraits, project screenshots, business photography and testimonials should be verified individually before being presented as authentic or owner-approved. A live independent concept is not the same thing as a client-approved launch.

## Project carousel

The homepage and Projects page use an accessible horizontal project carousel:

- DAY 01–03 are labelled as shipped builds.
- DAY 04 is labelled IN PROGRESS.
- Personal experiments carry an EXPERIMENT status.
- Arrow buttons, keyboard Left/Right navigation, touch/trackpad scrolling and pagination indicators are supported.
- The homepage and full Projects page use the project dataset and may show different subsets; update the project data and rendered pages together when publishing later work.
- Project cards receive restrained project-specific accent colors without replacing the main portfolio identity.

## SITEPRO

`sitepro.html` is the portfolio-facing explanation of SITEPRO: a research-first, human-first, production-minded workflow for creating business websites. It explains principles, workflow stages, tool roles and the roadmap while clearly stating that SITEPRO is still an active concept rather than a finished commercial plugin.

## Customize these assets

1. Portrait — the homepage currently references `assets/images/profile/prathamesh.jpeg`; verify that this file is an approved portrait and optimize it for web.
2. Project screenshots — use real, accurately labelled browser screenshots; do not describe editorial artwork or a concept image as an authentic venue photograph.
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
