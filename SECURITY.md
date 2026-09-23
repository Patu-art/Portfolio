# Security and publishing policy

This is a **public frontend portfolio**. HTML, CSS, JavaScript, screenshots and other committed assets are publicly accessible. No server credentials, service-role keys, private data or proprietary SITEPRO backend code belong here.

## Publishing policy

Only the repository owner may authorize production changes. External contributors may suggest changes using issues or pull requests; a pull request is not permission to merge it. The `.github/CODEOWNERS` file requests review from `@Patu-art` for all paths, but **CODEOWNERS alone does not block pushes**. Configure enforced `main` branch protection and review repository collaborators, GitHub Apps, deploy keys and token permissions in GitHub Settings.

The portfolio synchronization workflow is manual and read-only. Preview generation cannot commit or publish changes automatically. To update preview assets, inspect the changes, run quality checks and have the owner approve publishing.

## Backend boundary

The public portfolio is hosted as a static site. Its contact form uses a separate Supabase project. The Advanced SITEPRO editor, billing and publishing backend must be developed and deployed as a separate private application with server-side authorization. Do not mistake this portfolio's `sitepro.html` concept page for that backend.

## Reporting

Do not include working exploits, credentials or private customer data in public issues. Contact the repository owner through the email linked on the portfolio contact page.
