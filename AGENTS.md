# Repository conventions

## Language

- Use English for documentation, code comments, tooling messages, test descriptions, commit messages, and pull request titles and descriptions.
- English is the default site language (`defaultLanguage: "en"`).
- Preserve English and Brazilian Portuguese article versions and localized interface strings. Do not translate or remove Portuguese content when editing repository documentation.
- Keep existing article identifiers and publication URLs stable.

## Validation and deployment

- Run `npm run check` after changes affecting the generated site.
- Keep deployment manual: publishing requires an explicit `workflow_dispatch` run on `main` with `publish: true`.
- Pushes, pull requests, and merges must not deploy the site.
- Do not change repository visibility as part of routine implementation work.
