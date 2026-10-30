# Bruno Vicco · Technical notes / Notas técnicas

Publicação técnica bilíngue sobre engenharia de IA, arquitetura, agentes, segurança, observabilidade e governança. Site estático, sem dependências de execução, com versões integrais dos artigos em português do Brasil e inglês.

## Conteúdo

- 49 artigos técnicos, com versões integrais em PT-BR e inglês: 98 páginas de artigos.
- 34 textos originalmente em português e 15 em inglês. Cada tradução tem atribuição, ligação ao original e indicação de revisão editorial pendente.
- 226 imagens internas armazenadas localmente, com legendas e acesso em tamanho maior.
- Capas editoriais SVG geradas durante o build.

As datas e referências das publicações originais são preservadas. Traduções assistidas por IA são identificadas e possuem estado de revisão editorial por versão. A revisão de conteúdo técnico e regulatório é independente da tradução.

## Executar localmente

Requisito: Node.js 22 ou superior. Não há dependências para instalar.

```sh
npm run check
npm run serve
```

Acesse `http://127.0.0.1:4173/technical-articles/pt-br/` ou `/technical-articles/en/`.

O build gera `dist/`. A pasta é ignorada no Git e recriada pelo GitHub Actions a cada validação.

| Comando | Função |
|---|---|
| `npm run build` | Gera o site estático em `dist/` |
| `npm test` | Executa os testes; requer um build atualizado |
| `npm run check` | Executa o build e os testes |
| `npm run serve` | Serve a versão de `dist/` localmente |

## Integração contínua e publicação

Pushes em `main` e pull requests executam **somente build e testes**. O merge de uma PR não publica o site.

A publicação no GitHub Pages é manual e vem desativada por padrão:

1. Configure **Settings → Pages → Build and deployment → GitHub Actions** quando o site estiver pronto para publicação.
2. Abra **Actions → Validate and optionally publish technical articles → Run workflow**.
3. Selecione a branch `main` e marque o parâmetro **publish** explicitamente.

Sem esse parâmetro, a execução manual também faz apenas a validação. A publicação a partir de outras branches é bloqueada. O job de implantação recebe permissões de Pages somente quando executado. O workflow não altera a visibilidade do repositório.

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

O build aplica destaque semântico de código a identificadores inequívocos (como `dspy.Predict`, `execution_id` e chamadas de função), trechos delimitados por crases e termos específicos dos artigos DSPy. Para identificar outros nomes de classes ou símbolos, acrescente uma lista `codeTerms` ao `article.json`. Os HTMLs importados não são reescritos por essa formatação. Títulos, links e trechos já marcados como código são preservados. Blocos vazios não são exibidos; a importação não reconstrói trechos ausentes.

Cada versão em `versions` usa `title` e `kind`. A versão original tem `kind: "original"`; a tradução tem `kind: "translation"`, `translatedFrom` e `reviewStatus: "unreviewed"` ou `"reviewed"`. Depois de revisar o texto, mude o estado para `reviewed`; o aviso público passa a refletir essa revisão.

Por padrão, o build interrompe a publicação se faltar uma versão. Para desenvolvimento temporário de uma importação incompleta, `ALLOW_INCOMPLETE_TRANSLATIONS=1 npm run build` produz somente as versões já disponíveis; não use esse modo em produção.

## Reimportar HTMLs do LinkedIn

O importador aceita somente a pasta de HTMLs dos artigos e exige Python 3, sem pacotes adicionais:

```sh
python3 scripts/import-linkedin.py /caminho/para/Articles/Articles
python3 scripts/recover-media.py
npm run check
```

O importador processa somente artigos com data de publicação e sanitiza a marcação. A reimportação atualiza o idioma original e preserva os metadados das traduções existentes. Se o texto original mudar, revise também a tradução correspondente antes de integrar as alterações.

## Recursos e validação

Busca no texto completo, filtros por assunto e ano, ordenação, URLs compartilháveis para filtros, alternância de idioma no mesmo artigo, tema claro/escuro, sumário com âncoras, cópia de código, impressão, RSS por idioma, sitemap, canonical, hreflang e metadados estruturados.

`npm run check` verifica cobertura bilíngue, preservação estrutural de traduções, código e links, integridade das imagens, rotas internas, idiomas, avisos de tradução e ausência dos caminhos locais/dados privados conhecidos da exportação. Esses testes não substituem revisão editorial do texto técnico.

Não há analytics, cookies de rastreamento, fontes remotas, backend, API paga ou formulário de contato. A preferência de tema é salva apenas no navegador do leitor.

---

## English

A dependency-free static technical publication for GitHub Pages, with 49 source articles and 98 full article pages in Brazilian Portuguese and English. Run `npm run check`, then `npm run serve` with Node.js 22+.

Articles live in `content/articles/<id>/`, with metadata in `article.json` and full bodies in `pt-br.html` and `en.html`. Translations retain the original HTML structure, references and code. AI-assisted translations are labeled and await the author’s editorial review. Dates and historical claims are preserved, not updated or independently verified.

The 226 original inline images are hosted locally, and editorial SVG covers are generated at build time. Pushes to `main` and pull requests build and test the site without deploying. GitHub Pages deployment requires a manual workflow run on `main` with the **publish** input explicitly enabled; its default is **false**. The workflow does not change repository visibility.
