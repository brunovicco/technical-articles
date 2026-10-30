# Bruno Vicco · Technical notes

A bilingual technical publication about AI engineering, architecture, agents, security, observability, and governance. This dependency-free static site includes full articles in English and Brazilian Portuguese.

**English is the default language** for the repository, documentation, tooling, and site entry point. Brazilian Portuguese remains available as a localized reading experience.

## Features

- Full-text search, topic and year filters, chronological sorting, and shareable filter URLs.
- Language switching on the same article, light/dark themes, and responsive layouts.
- Linked table of contents, inline code styling, copyable code blocks, and print styles.
- Locally hosted figures, captions, full-size images, and generated editorial SVG covers.
- Separate RSS feeds, a sitemap, canonical URLs, `hreflang`, and structured article metadata.
- Automated builds and tests, with deployment controlled by an explicit manual action.

The collection contains 49 articles, 98 language versions, and 226 inline images. Original publication dates and references are preserved. AI-assisted translations are labeled and track editorial review status separately from the technical review of their claims.

## Quick start

Requires **Node.js 22 or later**. No package installation is necessary.

```sh
npm run check
npm run serve
```

Open `http://127.0.0.1:4173/technical-articles/` to enter the English edition. Both editions are also available directly:

- English: `http://127.0.0.1:4173/technical-articles/en/`
- Brazilian Portuguese: `http://127.0.0.1:4173/technical-articles/pt-br/`

| Command | Purpose |
|---|---|
| `npm run build` | Generate the static site in `dist/` |
| `npm test` | Run tests against an up-to-date build |
| `npm run check` | Build the site and run all tests |
| `npm run serve` | Serve `dist/` locally |

The generated `dist/` directory is not committed to Git.

## Project structure

```text
content/articles/<id>/
  article.json             Metadata, topics, and language versions
  en.html                  Full English article body
  pt-br.html               Full Brazilian Portuguese article body
public/assets/             Styles, browser scripts, and local media
scripts/                   Build, import, code formatting, and tests
site.config.json           Site identity, default language, URL, and links
.github/workflows/pages.yml
```

## Repository language

Write documentation, code comments, tooling messages, test descriptions, commit messages, and pull request titles and descriptions in English. Keep localized article bodies, titles, captions, and interface strings in their intended languages. Existing article identifiers and original publication URLs remain stable.

Repository contribution guidance is recorded in [AGENTS.md](AGENTS.md).

## Editing and adding articles

Each article directory contains metadata and a full HTML body for both supported languages. The stable `id` forms the article URL; use lowercase ASCII letters, digits, and hyphens.

To add an article, follow an existing directory's structure and provide `article.json`, `en.html`, and `pt-br.html`. Bodies contain article content only, without document wrappers, scripts, or styles. The build applies a shared layout.

Available topics are `agents`, `security`, `governance`, `engineering`, `platforms`, and `observability`.

### Language versions and editorial review

Each entry in `versions` specifies a title and version type:

- `kind: "original"` identifies the original-language text.
- `kind: "translation"` includes `translatedFrom` and `reviewStatus`.
- `reviewStatus: "unreviewed"` or `"reviewed"` controls the translation notice on the article page.

The normal build requires both languages. For a temporary preview during an incomplete import, use `ALLOW_INCOMPLETE_TRANSLATIONS=1 npm run build`. Always use the complete validation workflow before deployment.

### Code and figures

The build marks technical identifiers, function calls, backtick-delimited snippets, and selected DSPy symbols as semantic code. An optional `codeTerms` list in `article.json` adds other symbols or class names. Imported bodies are not rewritten by presentation formatting; headings, links, and existing code markup are preserved.

Inline figures are served from `public/assets/media/`. Editorial SVG covers are generated during the build. Empty code placeholders are omitted; missing source content is not reconstructed by the importer.

### Importing LinkedIn HTML articles

The optional import and media recovery utilities require **Python 3**, with no additional packages:

```sh
python3 scripts/import-linkedin.py /path/to/Articles/Articles
python3 scripts/recover-media.py
npm run check
```

The importer processes articles with recorded publication dates, sanitizes their markup, and preserves existing translation metadata. Review the corresponding translation whenever the source body changes, and inspect the build before integrating content updates.

## Configuration

Edit `site.config.json` to change the site identity, default language, author links, and URL. `defaultLanguage` is `en`; both `en` and `pt-br` are supported. The root entry point, fallback page, and preview link use this setting.

On GitHub Actions, the default site URL is derived from `GITHUB_REPOSITORY`. Set `SITE_URL` to build for a different address or custom domain. Custom domains also require configuration in **Settings → Pages**.

Article routes retain the following structure:

```text
/en/articles/<id>/
/pt-br/artigos/<id>/
```

## Continuous integration and deployment

Pushes to `main` and pull requests run **build and tests only**. Merging a pull request does not publish the site.

GitHub Pages deployment is manual and disabled by default:

1. Configure **Settings → Pages → Build and deployment → GitHub Actions** when ready to publish.
2. Open **Actions → Validate and optionally publish technical articles → Run workflow**.
3. Select `main` and explicitly enable the **publish** input.

Without that input, a manual run only validates the site. Deployment from other branches is blocked. Pages permissions are granted only to the deployment job. The workflow does not change repository visibility.

See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Validation and privacy

Tests verify bilingual coverage, preservation of translation structure and code, local references, media integrity, routes, language metadata, English defaults, and code formatting. Automated checks do not replace editorial review of technical content.

The site has no backend, analytics, tracking cookies, or remote fonts. Theme preferences are stored only in the reader's browser.
