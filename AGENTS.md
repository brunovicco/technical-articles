# Repository conventions

## Language

- Use English for documentation, code comments, tooling messages, test descriptions, commit messages, and pull request titles and descriptions.
- English is the default site language (`defaultLanguage: "en"`).
- Preserve English and Brazilian Portuguese article versions and localized interface strings. Do not translate or remove Portuguese content when editing repository documentation.
- Keep existing article identifiers and publication URLs stable.

## Commits and pull requests

- Do not mention Claude, Anthropic, or any AI assistant in commit messages or pull request titles and descriptions.
- Do not add `Co-Authored-By` trailers or "Generated with" lines. Commits and pull requests are authored by the repository owner only.

## Validation and deployment

- Run `npm run check` after changes affecting the generated site.
- Keep deployment manual: publishing requires an explicit `workflow_dispatch` run on `main` with `publish: true`.
- Pushes, pull requests, and merges must not deploy the site.
- Finished articles that should not go live yet carry `"status": "ready"` in `article.json` (see the README); check them with `npm run articles:status` before a deploy.
- The required "Repository security invariants" check runs `node scripts/security-invariants.mjs`; keep workflow permissions at `contents: read` and the deploy job gated on a manual run from `main`.
- Do not change repository visibility as part of routine implementation work.
