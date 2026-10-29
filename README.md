# Bruno Vicco · Technical notes / Notas técnicas

Site estático bilíngue de artigos técnicos, preparado para GitHub Pages. O design segue a referência visual fornecida pelo autor: azul-marinho, tipografia sem serifa, capas editoriais, sumário lateral e painel de leitura branco.

## Conteúdo

- 49 artigos publicados na exportação do LinkedIn, com versões integrais em PT-BR e inglês: 98 páginas de artigos.
- 34 textos originalmente em português e 15 em inglês. Cada tradução tem atribuição, ligação ao original e indicação de revisão editorial pendente.
- 226 imagens internas recuperadas e armazenadas localmente. As capas SVG são novas peças editoriais geradas pelo site; não substituem os diagramas originais.
- Quatro HTMLs sem data de publicação confirmada não foram importados, nem incluídos no repositório.
- Nenhum CSV de conexões, mensagens, candidaturas ou outros dados privados faz parte do site.

As datas dos artigos e suas afirmações históricas foram preservadas. A tradução não é uma atualização factual ou regulatória. Algumas lacunas de identificadores e pequenas inconsistências editoriais já presentes no HTML de origem foram mantidas; revise o artigo antes de fazer alterações que mudem seu significado.

## Executar localmente

Requisito: Node.js 22 ou superior. Não há dependências para instalar.

```sh
npm run check
npm run serve
```

Acesse `http://127.0.0.1:4173/technical-articles/pt-br/` ou `/technical-articles/en/`.

O build gera `dist/`. A pasta é ignorada no Git; o GitHub Actions a recria a cada publicação.

## Publicar no GitHub Pages

1. Envie este projeto para `brunovicco/technical-articles`, branch `main`.
2. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` valida as duas línguas e publica `dist/`.

Endereços previstos:

- PT-BR: `https://brunovicco.github.io/technical-articles/pt-br/`
- English: `https://brunovicco.github.io/technical-articles/en/`

Pull requests executam o build e os testes sem publicar. Pushes em `main` e execução manual publicam o site.

Se mudar o repositório ou domínio, atualize `site.config.json`. Em Actions, o endereço padrão é derivado de `GITHUB_REPOSITORY`; `SITE_URL` permite informar um domínio personalizado. A configuração do domínio em Settings → Pages continua necessária.

Referência: [GitHub — workflows personalizados para Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Editar ou adicionar artigos

Cada diretório `content/articles/<id>/` contém:

```text
article.json   # título, data, temas, origem e estado de cada idioma
pt-br.html     # corpo integral em português
en.html        # corpo integral em inglês
```

O `id` é estável e forma a URL nos dois idiomas. Use apenas letras minúsculas, números e hífens. Para criar um artigo, crie a pasta, os dois HTMLs e os metadados seguindo um artigo existente. Não inclua `<html>`, `<head>`, scripts ou CSS nos corpos: o layout é centralizado.

Temas suportados: `agents`, `security`, `governance`, `engineering`, `platforms`, `observability`. Eles alimentam filtros e rótulos nos dois idiomas.

Cada versão em `versions` usa `title` e `kind`. A versão original tem `kind: "original"`; a tradução tem `kind: "translation"`, `translatedFrom` e `reviewStatus: "unreviewed"` ou `"reviewed"`. Depois de revisar o texto, mude o estado para `reviewed`; o aviso público passa a refletir essa revisão.

Por padrão, o build interrompe a publicação se faltar uma versão. Para desenvolvimento temporário de uma importação incompleta, `ALLOW_INCOMPLETE_TRANSLATIONS=1 npm run build` produz somente as versões já disponíveis; não use esse modo em produção.

## Reimportar HTMLs do LinkedIn

O importador aceita somente a pasta de HTMLs dos artigos e exige Python 3, sem pacotes adicionais:

```sh
python3 scripts/import-linkedin.py /caminho/para/Articles/Articles
python3 scripts/recover-media.py
npm run check
```

Ele exclui arquivos sem publicação datada e sanitiza a marcação. A reimportação atualiza o idioma original, preserva os metadados da tradução existente e exige revisão manual dessa tradução caso a origem tenha mudado. Não a execute apontando para dados de terceiros sem autorização.

## Recursos e validação

Busca no texto completo, filtros por assunto e ano, ordenação, URLs compartilháveis para filtros, alternância de idioma no mesmo artigo, tema claro/escuro, sumário com âncoras, cópia de código, impressão, RSS por idioma, sitemap, canonical, hreflang e metadados estruturados.

`npm run check` verifica cobertura bilíngue, preservação estrutural de traduções, código e links, integridade das imagens, rotas internas, idiomas, avisos de tradução e ausência dos caminhos locais/dados privados conhecidos da exportação. Esses testes não substituem revisão editorial do texto técnico.

Não há analytics, cookies de rastreamento, fontes remotas, backend, API paga ou formulário de contato. A preferência de tema é salva apenas no navegador do leitor.

---

## English

A dependency-free static technical publication for GitHub Pages, with 49 source articles and 98 full article pages in Brazilian Portuguese and English. Run `npm run check`, then `npm run serve` with Node.js 22+.

Articles live in `content/articles/<id>/`, with metadata in `article.json` and full bodies in `pt-br.html` and `en.html`. Translations retain the original HTML structure, references and code. AI-assisted translations are labeled and await the author’s editorial review. Dates and historical claims are preserved, not updated or independently verified.

The 226 original inline images are hosted locally. Four undated/unpublished source documents and the rest of the LinkedIn data export are excluded. The Pages workflow builds and tests every version before deployment, and pull requests never deploy.
