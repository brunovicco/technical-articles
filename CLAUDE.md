# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `AGENTS.md` for repository conventions (English for all docs, comments, commits, and PRs; keep Portuguese article content; keep article IDs/URLs stable; deployment is manual only). `README.md` documents authoring, import, and profile-sync workflows in detail.

## Commands

Node >= 22, no dependencies, no `npm install` needed.

```sh
npm run check      # build + all tests (run after any change affecting the generated site)
npm run build      # generate dist/ via scripts/build.mjs
npm test           # node --test scripts/*.test.mjs (reads dist/, so build first)
npm run serve      # serve dist/ at http://127.0.0.1:4173/technical-articles/
npm run new:article -- <slug> [en]   # scaffold an article from templates/article
```

Run a single test file or case (after `npm run build`):

```sh
node --test scripts/site.test.mjs
node --test --test-name-pattern="English is the default" scripts/site.test.mjs
```

`ALLOW_INCOMPLETE_TRANSLATIONS=1 npm run build` permits a missing language version for previews only. `SITE_URL` overrides the site URL; on GitHub Actions it is derived from `GITHUB_REPOSITORY`.

## Architecture

A dependency-free static site generator. `scripts/build.mjs` is the whole pipeline: it reads `site.config.json`, `content/articles/<id>/{article.json,en.html,pt-br.html}`, and `content/profile/*.md`, then writes `dist/` (not committed). All HTML is produced by template-literal functions in that file (`shell`, `homepage`, `articlepage`, `aboutpage`, ...), plus RSS feeds, and sitemap. Page-level UI strings live in the `messages` object (per language) at the top of `build.mjs`.

Key points that span files:

- **Bilingual routing**: every article exists in both languages with different path segments (`/en/articles/<id>/` vs `/pt-br/artigos/<id>/`; About is `/en/about/` vs `/pt-br/sobre/`). The build fails if either language body is missing. `defaultLanguage` in `site.config.json` drives the root redirect, 404 page, and hreflang.
- **Article metadata**: `article.json` `versions` entries mark `kind: "original"` or `"translation"` (with `translatedFrom`, `reviewStatus`), which controls the translation notice. Omit `sourceUrl` for native articles; set it (HTTPS) for republications. Bodies are content fragments only (no wrappers/scripts/styles); `localizeBody` and `scripts/format-code.mjs` apply semantic code markup at build time without rewriting source files.
- **About page / profile sync**: `content/profile/*.md` are build-time offline snapshots. At runtime `public/assets/profile-sync.mjs` fetches the live GitHub profile README and `profile-content.mjs` (shared by build and browser, and imported by `build.mjs`) extracts and safely renders the sections. Both language sources must be maintained manually.
- **Static assets** in `public/assets/` (`style.css`, a second stylesheet, `site.js`, `theme.js`, `media/`, `media.json`) are copied to `dist/assets/`. Inline article figures live in `public/assets/media/`.
- **Tests** (`scripts/*.test.mjs`, `node:test`) assert against the built `dist/` output (bilingual coverage, local references, media integrity, routes, metadata), so a stale `dist/` gives misleading results. `npm run check` always rebuilds first.
- **Python utilities** (`import-linkedin.py`, `recover-media.py`) are optional one-off importers for LinkedIn exports; Python 3 stdlib only.
- **CI** (`.github/workflows/pages.yml`): pushes/PRs run `npm run check` only. Pages deploy requires a manual `workflow_dispatch` on `main` with `publish: true`.

## Working-tree note

At the time of writing, `scripts/build.mjs` has an uncommitted change switching the second stylesheet link from `reference-design.css` to the new untracked `public/assets/journal.css`. Check which stylesheet is current before editing styles.
