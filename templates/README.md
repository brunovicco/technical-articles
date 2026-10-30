# Bilingual article template

Create an article from the repository root:

```sh
npm run new:article -- my-article-slug
```

The default original language is Brazilian Portuguese. For an English original:

```sh
npm run new:article -- my-article-slug en
```

The command creates `content/articles/<slug>/` with today's publication date in
the author's time zone, two sample HTML bodies, and metadata. It never overwrites
an existing directory. Replace all sample text before merging.

1. Set both titles, the publication date, and topics in `article.json`.
2. Write the original and full translation in `pt-br.html` and `en.html`.
3. Preserve code and references across languages. HTML bodies do not need document
   wrappers, scripts, styles, or a repeated article title. Use `<h2>` for sections,
   `<code>` for inline code, and `<pre><code>` for code blocks.
4. Keep `reviewStatus: "unreviewed"` until the author has reviewed the translation.
   Then set it to `"reviewed"`. This is editorial review, not technical verification.
5. For an original publication on this site, omit `sourceUrl`. For a republication,
   add the original HTTPS URL. LinkedIn is supported but not required.
6. Put figures in `public/assets/media/` and use an absolute project path such as
   `/technical-articles/assets/media/my-diagram.svg` in both bodies. Add descriptive
   alt text. The `images` list is for imported LinkedIn media keys; it can remain empty
   for direct local image references.
7. Run `npm run check`, then `npm run serve` to inspect both language versions.
8. Open a pull request. After validation and merge, publish explicitly through the
   manual Pages workflow with `publish: true` on `main`.

Available topics: `agents`, `security`, `governance`, `engineering`, `platforms`,
and `observability`. Keep the slug unchanged after publication to preserve URLs.

Templates are outside `content/articles/` and are never published automatically.
