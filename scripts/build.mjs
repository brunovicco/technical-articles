import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatCode } from './format-code.mjs';
import { goatcounterCode, goatcounterTag } from './analytics.mjs';
import { renderProfile, renderProjects, profileSources } from '../public/assets/profile-content.mjs';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await fs.readFile(path.join(root,'site.config.json'),'utf8'));
const defaultLanguage=config.defaultLanguage || 'en';
if(!['en','pt-br'].includes(defaultLanguage))throw new Error(`Unsupported default language: ${defaultLanguage}`);
const goatcounter=goatcounterCode(process.env.GOATCOUNTER ?? config.goatcounter);
const repository=process.env.GITHUB_REPOSITORY;
const inferredUrl=repository ? `https://${repository.split('/')[0]}.github.io${repository.split('/')[1]===`${repository.split('/')[0]}.github.io`?'':'/'+repository.split('/')[1]}` : config.url;
const siteUrl=(process.env.SITE_URL || inferredUrl).replace(/\/$/,'');
const base=new URL(siteUrl).pathname.replace(/\/$/,'');
const output=path.join(root,'dist');
export const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const decode=value=>value.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const plain=value=>decode(value.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const normalize=value=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
const isoLocale=lang=>lang==='pt-br'?'pt-BR':'en';
const other=lang=>lang==='pt-br'?'en':'pt-br';
const articlePath=(lang,id)=>`/${lang}/${lang==='pt-br'?'artigos':'articles'}/${id}/`;
const trackPath=(lang,id)=>`/${lang}/${lang==='pt-br'?'trilhas':'tracks'}/${id}/`;
const url=route=>base+route;
const absolute=route=>siteUrl+route;
const messages={
  'pt-br':{
    notes:'Notas técnicas',articles:'Artigos',tracks:'Trilhas',tracksEyebrow:'TRILHAS DE LEITURA',tracksDesc:'Sequências de artigos que se constroem uns sobre os outros, para ler em ordem.',trackLabel:'TRILHA',part:'PARTE',of:'DE',thisTrack:'Esta trilha',trackCount:'artigos',startTrack:'Começar a trilha',allTracks:'Todas as trilhas',about:'Sobre',menu:'Menu',skip:'Pular para o conteúdo',
    eyebrow:'ENGENHARIA DE IA · ARQUITETURA · GOVERNANÇA',hero:'IA em produção.<br><em>Decisões em perspectiva.</em>',
    intro:'Notas sobre construir, observar e governar sistemas de IA. Da arquitetura de agentes às decisões que precisam continuar funcionando em produção.',
    browse:'Explorar os artigos',latest:'LEITURA EM DESTAQUE',all:'Todos os artigos',library:'BIBLIOTECA',
    libraryDesc:'Ideias, experimentos e decisões de engenharia, em português e inglês.',
    search:'Buscar por assunto, tecnologia ou palavra-chave',searchLabel:'Buscar nos artigos',clear:'Limpar busca',
    allYears:'Todos os anos',yearLabel:'Filtrar por ano',sortLabel:'Ordenar artigos',newest:'Mais recentes',oldest:'Mais antigos',
    results:'artigos encontrados',empty:'Nenhum artigo encontrado.',emptyHelp:'Tente outro termo ou remova os filtros.',reset:'Limpar filtros',
    read:'Ler artigo',minutes:'min de leitura',toc:'Neste artigo',original:'Texto original',translation:'Tradução do original em inglês',
    native:'Publicado originalmente neste site',linkedin:'Publicado originalmente no LinkedIn',image:'Figura do artigo original — ver no LinkedIn',
    related:'Continue a leitura',back:'Voltar aos artigos',footer:'Engenharia, arquitetura e IA em produção.',feed:'Feed RSS',theme:'Alternar tema claro ou escuro',
    copied:'Copiado',copy:'Copiar código',aboutTitle:'Engenharia com contexto.',aboutEyebrow:'SOBRE O AUTOR',
    archiveNote:'Textos completos em português e inglês. As traduções estão identificadas nos artigos.',
    source:'ORIGEM',published:'Publicado em',notFound:'Página não encontrada',notFoundDesc:'O endereço pode ter mudado. Explore a biblioteca para encontrar o artigo.',
    tags:{agents:'Arquitetura & agentes',security:'Segurança',governance:'Governança',engineering:'Engenharia',platforms:'Plataformas',observability:'Observabilidade'},
  },
  en:{
    notes:'Technical notes',articles:'Articles',tracks:'Tracks',tracksEyebrow:'READING TRACKS',tracksDesc:'Sequences of articles that build on each other, meant to be read in order.',trackLabel:'TRACK',part:'PART',of:'OF',thisTrack:'This track',trackCount:'articles',startTrack:'Start the track',allTracks:'All tracks',about:'About',menu:'Menu',skip:'Skip to content',
    eyebrow:'AI ENGINEERING · ARCHITECTURE · GOVERNANCE',hero:'AI in production.<br><em>Decisions in perspective.</em>',
    intro:'Notes on building, observing and governing AI systems. From agent architectures to the decisions that need to hold up in production.',
    browse:'Explore the articles',latest:'FEATURED READING',all:'All articles',library:'THE LIBRARY',
    libraryDesc:'Ideas, experiments and engineering decisions, in Portuguese and English.',
    search:'Search by topic, technology or keyword',searchLabel:'Search articles',clear:'Clear search',
    allYears:'All years',yearLabel:'Filter by year',sortLabel:'Sort articles',newest:'Newest first',oldest:'Oldest first',
    results:'articles found',empty:'No articles found.',emptyHelp:'Try another term or remove the filters.',reset:'Reset filters',
    read:'Read article',minutes:'min read',toc:'On this page',original:'Original text',translation:'Translated from Portuguese',
    native:'Originally published on this site',linkedin:'Originally published on LinkedIn',image:'Figure from the original article — view on LinkedIn',
    related:'Keep reading',back:'Back to articles',footer:'Engineering, architecture and AI in production.',feed:'RSS feed',theme:'Toggle light or dark theme',
    copied:'Copied',copy:'Copy code',aboutTitle:'Engineering in context.',aboutEyebrow:'ABOUT THE AUTHOR',
    archiveNote:'Full articles in Portuguese and English. Translations are identified on article pages.',
    source:'SOURCE',published:'Published on',notFound:'Page not found',notFoundDesc:'The address may have changed. Explore the library to find the article.',
    tags:{agents:'Architecture & agents',security:'Security',governance:'Governance',engineering:'Engineering',platforms:'Platforms',observability:'Observability'},
  },
};

const directories=(await fs.readdir(path.join(root,'content/articles'),{withFileTypes:true})).filter(entry=>entry.isDirectory());
const tracks=await fs.readFile(path.join(root,'content/tracks.json'),'utf8').then(JSON.parse,error=>{if(error.code==='ENOENT')return [];throw error;});
for(const track of tracks){
  if(!/^[a-z0-9-]+$/.test(track.id))throw new Error(`Invalid track id: ${track.id}`);
  for(const lang of ['pt-br','en'])if(!track.title?.[lang]||!track.description?.[lang])throw new Error(`Track ${track.id} needs a title and description in ${lang}`);
}
if(new Set(tracks.map(track=>track.id)).size!==tracks.length)throw new Error('Duplicate track id');
const articles=[];
for(const entry of directories){
  const dir=path.join(root,'content/articles',entry.name);
  const metadata=JSON.parse(await fs.readFile(path.join(dir,'article.json'),'utf8'));
  if(!/^[a-z0-9-]+$/.test(metadata.id)||metadata.id!==entry.name)throw new Error(`Invalid article id: ${entry.name}`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(metadata.date))throw new Error(`Invalid publication date: ${entry.name}`);
  if(metadata.sourceUrl != null && metadata.sourceUrl !== ''){
    const source=new URL(metadata.sourceUrl);
    if(source.protocol!=='https:' || source.username || source.password)throw new Error(`Invalid source URL: ${entry.name}`);
  }
  metadata.sourceUrl=metadata.sourceUrl || undefined;
  metadata.images ??= [];
  for(const [coverLang,file] of Object.entries(metadata.cover||{})){
    if(!['en','pt-br'].includes(coverLang))throw new Error(`Invalid cover language: ${entry.name}/${coverLang}`);
    if(!/^[\w.-]+\.(png|jpe?g|webp)$/i.test(file))throw new Error(`Invalid cover file: ${entry.name}/${file}`);
    await fs.access(path.join(root,'public/assets/banners',file)).catch(()=>{throw new Error(`Missing cover file: ${entry.name}/${file}`);});
  }
  if(metadata.series){
    if(!tracks.some(track=>track.id===metadata.series.id))throw new Error(`Unknown track: ${entry.name} → ${metadata.series.id}`);
    if(!Number.isInteger(metadata.series.part) || metadata.series.part<1)throw new Error(`Invalid track part: ${entry.name}`);
  }
  metadata.content={};metadata.excerpt={};metadata.wordCount={};
  for(const lang of ['pt-br','en']){
    if(!metadata.versions[lang]){
      if(process.env.ALLOW_INCOMPLETE_TRANSLATIONS==='1')continue;
      throw new Error(`Missing full translation: ${metadata.id}/${lang}`);
    }
    const body=await fs.readFile(path.join(dir,`${lang}.html`),'utf8');
    if(/<(script|iframe|style|object)\b|\bon\w+\s*=|javascript\s*:/i.test(body))throw new Error(`Unsafe content: ${entry.name}/${lang}`);
    metadata.content[lang]=body;
    const first=(body.match(/<p>([\s\S]*?)<\/p>/)||[])[1]||body;
    const text=plain(first).replace(/\s+([,.;:!?])/g,'$1');metadata.excerpt[lang]=text.length>240?text.slice(0,237).replace(/\s+\S*$/,'')+'…':text;
    metadata.wordCount[lang]=plain(body).split(/\s+/).length;
  }
  articles.push(metadata);
}
articles.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
for(const track of tracks){
  track.number=String(tracks.indexOf(track)+1).padStart(2,'0');
  track.articles=articles.filter(a=>a.series?.id===track.id).sort((a,b)=>a.series.part-b.series.part);
  if(!track.articles.length)throw new Error(`Track without articles: ${track.id}`);
  if(new Set(track.articles.map(a=>a.series.part)).size!==track.articles.length)throw new Error(`Duplicate part in track: ${track.id}`);
}
const trackOf=article=>article.series&&tracks.find(track=>track.id===article.series.id);
let assets={};
try{assets=JSON.parse(await fs.readFile(path.join(root,'public/assets/media.json'),'utf8'));}catch{}
const sourceMap=new Map(articles.filter(a=>a.sourceUrl).map(a=>[decodeURIComponent(new URL(a.sourceUrl).pathname).replace(/\/$/,''),a]));
function localizeBody(article,lang){
  const text=messages[lang];const headings=[];let index=0;
  let content=formatCode(article.content[lang], {id:article.id, terms:article.codeTerms || []}).replace(/<h([234])>([\s\S]*?)<\/h\1>/g,(_,level,label)=>{
    const id=`section-${++index}`;headings.push({id,title:plain(label),level:Number(level)});
    return `<h${level} id="${id}" tabindex="-1">${label}<a class="heading-anchor" href="#${id}" aria-label="${lang==='pt-br'?'Link para esta seção':'Link to this section'}">#</a></h${level}>`;
  });
  content=content.replace(/<img\s[^>]*data-asset="([a-f0-9]+)"[^>]*>/g,(original,key)=>{
    const asset=assets[key];
    if(asset?.file)return original.replace(/src="[^"]*"/,`src="${url('/assets/media/'+asset.file)}"`).replace('<img ',`<img ${asset.width?`width="${asset.width}" height="${asset.height}" `:''}`);
    if(!article.sourceUrl)throw new Error(`Missing local media: ${article.id}/${key}`);
    return `<a class="image-fallback" href="${escape(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">↗ ${text.image}</a>`;
  });
  content=content.replace(/<figure>([\s\S]*?)<\/figure>/g,(_,figure)=>{
    const caption=plain((figure.match(/<figcaption>([\s\S]*?)<\/figcaption>/)||[])[1]||'');
    return '<figure>'+figure.replace(/<img\s([^>]+)>/g,(image,attributes)=>{
      const src=(attributes.match(/src="([^\"]+)"/)||[])[1];
      if(!src)return image;
      if(caption)image=image.replace('alt=""',`alt="${escape(caption)}"`);
      return `<a class="figure-zoom" href="${src}" target="_blank" rel="noopener noreferrer" aria-label="${lang==='pt-br'?'Ampliar figura':'Enlarge figure'}${caption?': '+escape(caption):''}">${image}<span class="figure-zoom-label">${lang==='pt-br'?'Ampliar':'Enlarge'} ↗</span></a>`;
    })+'</figure>';
  });
  content=content.replace(/href="(https?:[^\"]+)"/g,(match,href)=>{
    try {
      const target=new URL(decode(href));
      if(!/(^|\.)linkedin\.com$/.test(target.hostname))return match;
      const destination=sourceMap.get(decodeURIComponent(target.pathname).replace(/\/$/,''));
      if(destination?.versions[lang])return `href="${url(articlePath(lang,destination.id))}${escape(target.hash)}"`;
    }catch{}
    return match;
  });
  return {content,headings};
}
function dateLabel(date,lang){return new Intl.DateTimeFormat(isoLocale(lang),{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
function minutes(article,lang){return Math.max(1,Math.ceil(article.wordCount[lang]/220));}
function tagLabel(tag,lang){return messages[lang].tags[tag]||tag;}
function tags(article,lang){return `<div class="tags">${article.tags.map(tag=>`<span>${escape(tagLabel(tag,lang))}</span>`).join('')}</div>`;}
function languageSwitch(lang,alternate){
  const links=['en','pt-br'].map(candidate=>{
    const name=candidate==='en'?'English':'Português do Brasil';
    return `<a lang="${isoLocale(candidate)}" hreflang="${isoLocale(candidate)}" title="${name}" href="${url(candidate===lang?alternate.current:alternate.other)}" ${candidate===lang?'aria-current="page"':''}>${candidate==='en'?'EN':'PT'}<span class="sr-only"> · ${name}</span></a>`;
  });
  return `<nav class="languages" aria-label="${lang==='pt-br'?'Idioma':'Language'}">${links.join('')}</nav>`;
}
function shell({lang,title,description,route,alternate,body,article=null,noindex=false}){
  const t=messages[lang];
  const otherRoute=alternate || `/${other(lang)}/`;
  const coverImage=article?.cover?.[lang];
  const titleText=title?`${title} — ${config.title}`:`${config.title} — ${t.notes}`;
  const schema=article?{'@context':'https://schema.org','@type':'TechArticle',headline:title,description,datePublished:article.date,inLanguage:isoLocale(lang),author:{'@type':'Person',name:config.author,url:absolute(`/${lang}/${lang==='pt-br'?'sobre':'about'}/`)},mainEntityOfPage:absolute(route),isBasedOn:article.sourceUrl}:null;
  return `<!doctype html>
<html lang="${isoLocale(lang)}" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(titleText)}</title><meta name="description" content="${escape(description)}"><meta name="color-scheme" content="light dark">${noindex?'<meta name="robots" content="noindex">':''}<link rel="canonical" href="${absolute(route)}"><link rel="alternate" hreflang="${isoLocale(lang)}" href="${absolute(route)}"><link rel="alternate" hreflang="${isoLocale(other(lang))}" href="${absolute(otherRoute)}"><link rel="alternate" type="application/rss+xml" title="${escape(t.notes)}" href="${url('/'+lang+'/feed.xml')}"><link rel="icon" type="image/svg+xml" href="${url('/assets/favicon.svg')}"><link rel="stylesheet" href="${url('/assets/style.css')}"><link rel="stylesheet" href="${url('/assets/journal.css')}"><script src="${url('/assets/theme.js')}"></script><script defer src="${url('/assets/site.js')}"></script>${goatcounterTag(goatcounter,url('/assets/goatcounter.js'))}<meta property="og:type" content="${article?'article':'website'}"><meta property="og:locale" content="${lang==='pt-br'?'pt_BR':'en_US'}"><meta property="og:title" content="${escape(titleText)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${absolute(route)}">${coverImage?`<meta property="og:image" content="${absolute('/assets/banners/'+coverImage)}"><meta name="twitter:card" content="summary_large_image">`:`<meta property="og:image" content="${absolute('/assets/og/preview.png')}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">`}${schema?`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`:''}</head>
<body data-locale="${lang}" data-base="${base}"><a class="skip" href="#main">${t.skip}</a><div class="reading-progress" aria-hidden="true"></div>
<div class="topbar"><header class="site-header"><a class="identity" href="${url('/'+lang+'/')}"><span class="wordmark">Bruno Vicco<small>${t.notes}</small></span></a><div class="header-right"><nav class="main-nav" id="main-nav" aria-label="${lang==='pt-br'?'Navegação principal':'Main navigation'}"><a href="${url('/'+lang+'/')}#library">${t.articles}</a>${tracks.length?`<a href="${url('/'+lang+'/')}#tracks">${t.tracks}</a>`:''}<a href="${url('/'+lang+'/'+(lang==='pt-br'?'sobre':'about')+'/')}">${t.about}</a><a class="github-nav" href="${config.github}" rel="me noopener noreferrer" target="_blank">GitHub ↗</a></nav>${languageSwitch(lang,{current:route,other:otherRoute})}<button class="theme-toggle" type="button" aria-label="${t.theme}" title="${t.theme}">◐</button><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" hidden>${t.menu}</button></div></header></div>
${body}
<footer class="site-footer"><div><a href="${url('/'+lang+'/')}" class="footer-name">Bruno Vicco<span>•</span></a><p>${t.footer}</p></div><div class="footer-links"><a href="${config.github}">GitHub ↗</a><a href="${config.linkedin}" rel="me">LinkedIn ↗</a><a href="${url('/'+lang+'/feed.xml')}">${t.feed} ↗</a></div><small>© ${new Date().getUTCFullYear()} Bruno Vicco</small></footer></body></html>`;
}
function row(article,lang,index){
  const t=messages[lang];
  return `<li class="article-row" data-id="${article.id}" data-year="${article.date.slice(0,4)}" data-date="${article.date}" data-tags="${article.tags.join(' ')}" data-search="${escape(normalize(article.versions[lang].title+' '+article.excerpt[lang]))}"><div class="row-date"><time datetime="${article.date}">${dateLabel(article.date,lang)}</time><span>${String(index+1).padStart(2,'0')}</span></div><div class="row-copy">${tags(article,lang)}<h3><a href="${url(articlePath(lang,article.id))}">${escape(article.versions[lang].title)}</a></h3><p>${escape(article.excerpt[lang])}</p><span class="read-time">${minutes(article,lang)} ${t.minutes}${article.versions[lang].kind==='translation'?` <span aria-hidden="true">·</span> ${t.translation}`:''}</span></div><a class="row-arrow" href="${url(articlePath(lang,article.id))}" aria-label="${t.read}: ${escape(article.versions[lang].title)}">↗</a></li>`;
}
function tracksSection(lang){
  const t=messages[lang],available=tracks.filter(track=>track.articles.some(a=>a.versions[lang]));
  if(!available.length)return '';
  return `<section class="tracks" id="tracks" aria-labelledby="tracks-title"><div class="section-top"><div><p class="eyebrow">${t.tracksEyebrow}</p><h2 id="tracks-title">${t.tracks}</h2><p>${t.tracksDesc}</p></div></div><ol class="track-list">${available.map(track=>`<li class="track-card"><span class="track-num">${track.number}</span><div class="track-copy"><h3><a href="${url(trackPath(lang,track.id))}">${escape(track.title[lang])}</a></h3><p>${escape(track.description[lang])}</p></div><span class="track-count">${track.articles.filter(a=>a.versions[lang]).length} ${t.trackCount}</span></li>`).join('')}</ol></section>`;
}
function trackpage(track,lang){
  const t=messages[lang],available=track.articles.filter(a=>a.versions[lang]);
  const alternate=track.articles.some(a=>a.versions[other(lang)])?trackPath(other(lang),track.id):`/${other(lang)}/`;
  const body=`<main id="main" class="track-page"><div class="track-heading"><a class="back-link" href="${url('/'+lang+'/')}#tracks">← ${t.allTracks}</a><p class="eyebrow">${t.trackLabel} ${track.number}</p><h1>${escape(track.title[lang])}</h1><p class="track-lede">${escape(track.description[lang])}</p><span class="read-time">${available.length} ${t.trackCount}</span></div><ol class="track-articles">${available.map(a=>`<li class="track-item"><span class="track-part">${String(a.series.part).padStart(2,'0')}</span><div class="track-copy"><h2><a href="${url(articlePath(lang,a.id))}">${escape(a.versions[lang].title)}</a></h2><p>${escape(a.excerpt[lang])}</p><span class="read-time"><time datetime="${a.date}">${dateLabel(a.date,lang)}</time> · ${minutes(a,lang)} ${t.minutes}</span></div></li>`).join('')}</ol><a class="text-cta" href="${url(articlePath(lang,available[0].id))}">${t.startTrack} →</a></main>`;
  return shell({lang,title:track.title[lang],description:track.description[lang],route:trackPath(lang,track.id),alternate,body});
}
function featuredSection(article,lang){
  const t=messages[lang],href=url(articlePath(lang,article.id)),cover=article.cover?.[lang],title=escape(article.versions[lang].title);
  const media=cover?`<a class="featured-media" href="${href}" tabindex="-1" aria-hidden="true"><img src="${url('/assets/banners/'+cover)}" alt="" width="1600" height="900" fetchpriority="high"></a>`:'';
  return `<section class="featured${cover?' has-cover':''}" aria-labelledby="featured-title">${media}<div class="featured-body"><div class="featured-label"><span class="eyebrow">${t.latest}</span><time datetime="${article.date}">${dateLabel(article.date,lang)}</time></div><a class="featured-copy" href="${href}"><h2 id="featured-title">${title}</h2></a><p class="featured-excerpt">${escape(article.excerpt[lang])}</p><span class="read-time">${article.tags.map(tag=>escape(tagLabel(tag,lang))).join(' · ')} · ${minutes(article,lang)} ${t.minutes}</span><a class="text-cta" href="${href}">${t.read} →</a></div></section>`;
}
function homepage(lang){
  const t=messages[lang],available=articles.filter(a=>a.versions[lang]),featured=available[0];
  const years=[...new Set(available.map(a=>a.date.slice(0,4)))];
  const body=`<main id="main"><section class="hero"><div class="hero-copy"><p class="eyebrow">${t.eyebrow}</p><h1>${t.hero}</h1><p class="hero-intro">${t.intro}</p><a class="text-cta" href="#library">${t.browse} <span aria-hidden="true">↓</span></a></div><div class="architecture-art" aria-hidden="true"><div class="art-top"><span>FIELDNOTES / BV</span><span>01 — ∞</span></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="diagram-label label-input">CONTEXT</div><div class="diagram-line line-one"></div><div class="diagram-core"><span>AI</span><small>SYSTEMS</small></div><div class="diagram-line line-two"></div><div class="diagram-label label-output">PRODUCTION</div><div class="art-bottom"><span>BUILD.<br>OBSERVE.<br>GOVERN.</span><span class="art-dot">✳</span></div></div></section>
${featuredSection(featured,lang)}
${tracksSection(lang)}
<section class="library" id="library" aria-labelledby="library-title"><div class="section-top"><div><p class="eyebrow">${t.library}</p><h2 id="library-title">${t.all}<sup>${available.length}</sup></h2><p>${t.libraryDesc}</p></div><a class="rss-link" href="${url('/'+lang+'/feed.xml')}">${t.feed} ↗</a></div><div class="library-controls"><div class="search-field"><span aria-hidden="true">⌕</span><label class="sr-only" for="search">${t.searchLabel}</label><input type="search" id="search" placeholder="${t.search}" autocomplete="off"><button type="button" id="clear-search" aria-label="${t.clear}" hidden>×</button></div><label class="sr-only" for="year">${t.yearLabel}</label><select id="year"><option value="all">${t.allYears}</option>${years.map(y=>`<option>${y}</option>`).join('')}</select><label class="sr-only" for="sort">${t.sortLabel}</label><select id="sort"><option value="newest">${t.newest}</option><option value="oldest">${t.oldest}</option></select></div><div class="topics" role="group" aria-label="${lang==='pt-br'?'Filtrar por tema':'Filter by topic'}"><button type="button" data-topic="all" aria-pressed="true">${lang==='pt-br'?'Todos':'All'}</button>${Object.keys(t.tags).map(tag=>`<button type="button" data-topic="${tag}" aria-pressed="false">${t.tags[tag]}</button>`).join('')}</div><div class="results-bar"><p id="results" role="status" aria-live="polite">${available.length} ${t.results}</p><button type="button" id="reset-filters" hidden>${t.reset} ↺</button></div><ol class="article-list">${available.map((a,i)=>row(a,lang,i)).join('')}</ol><div class="empty-state" hidden><h3>${t.empty}</h3><p>${t.emptyHelp}</p></div><p class="archive-note">${t.archiveNote}</p><noscript><p>${lang==='pt-br'?'A lista completa está disponível abaixo. Ative JavaScript para usar a busca e os filtros.':'The full list is available below. Enable JavaScript to use search and filters.'}</p></noscript></section></main>`;
  return shell({lang,description:t.intro,route:`/${lang}/`,alternate:`/${other(lang)}/`,body});
}
function publicationSource(article,lang){
  const t=messages[lang];
  if(!article.sourceUrl)return {sidebar:`<p>${t.native}.</p>`,footer:`${t.native}.`};
  const host=new URL(article.sourceUrl).hostname;
  const linkedin=/(^|\.)linkedin\.com$/.test(host);
  const label=linkedin?'LinkedIn':host;
  const link=`<a href="${escape(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
  const footerLink=linkedin?link.replace('>LinkedIn ↗</a>',`>${lang==='pt-br'?'Ver publicação':'View publication'} ↗</a>`):link;
  return {sidebar:link,footer:linkedin?`${t.linkedin}. ${footerLink}`:`${lang==='pt-br'?'Publicado originalmente em':'Originally published on'} ${footerLink}.`};
}
function articlepage(article,lang){
  const t=messages[lang],version=article.versions[lang],title=version.title,{content,headings}=localizeBody(article,lang);
  const source=publicationSource(article,lang);
  const alternate=article.versions[other(lang)]?articlePath(other(lang),article.id):`/${other(lang)}/`;
  const related=articles.filter(a=>a.id!==article.id&&a.versions[lang]).map(a=>({a,shared:a.tags.filter(tag=>article.tags.includes(tag)).length})).sort((a,b)=>b.shared-a.shared||b.a.date.localeCompare(a.a.date)).slice(0,3).map(r=>r.a);
  const track=trackOf(article);
  const trackMates=track?track.articles.filter(a=>a.versions[lang]):[];
  const trackEyebrow=track?`<a class="eyebrow track-eyebrow" href="${url(trackPath(lang,track.id))}">${t.trackLabel} ${track.number} · ${escape(track.title[lang])} · ${t.part} ${article.series.part} ${t.of} ${trackMates.length}</a>`:'';
  const trackRail=track?`<section class="track-rail" aria-label="${t.thisTrack}"><span class="eyebrow">${t.thisTrack}</span><a class="track-rail-title" href="${url(trackPath(lang,track.id))}">${escape(track.title[lang])}</a><ol>${trackMates.map(a=>a.id===article.id?`<li aria-current="page"><span>${String(a.series.part).padStart(2,'0')}</span>${escape(a.versions[lang].title)}</li>`:`<li><span>${String(a.series.part).padStart(2,'0')}</span><a href="${url(articlePath(lang,a.id))}">${escape(a.versions[lang].title)}</a></li>`).join('')}</ol></section>`:'';
  const banner=article.cover?.[lang];
  const body=`<main id="main"><div class="article-heading"><a class="back-link" href="${url('/'+lang+'/')}#library">← ${t.back}</a>${trackEyebrow}${tags(article,lang)}<h1>${escape(title)}</h1><div class="article-meta"><span class="author-badge" aria-hidden="true">BV</span><span><strong>Bruno Vicco</strong><span class="meta-detail"><time datetime="${article.date}">${dateLabel(article.date,lang)}</time> · ${minutes(article,lang)} ${t.minutes}</span></span><span class="version-type">${version.kind==='translation'?t.translation:t.original}</span></div></div>${banner?`<figure class="article-banner"><img src="${url('/assets/banners/'+banner)}" alt="${escape(title)}" width="1600" height="900" fetchpriority="high"></figure>`:''}<div class="reading-layout"><aside class="toc"><details open><summary>${t.toc}</summary><nav aria-label="${t.toc}">${headings.map(h=>`<a class="toc-level-${h.level}" href="#${h.id}">${escape(h.title)}</a>`).join('')}</nav></details>${trackRail}<div class="toc-source"><span class="eyebrow">${t.source}</span>${source.sidebar}</div></aside><div class="reading-main"><article class="prose" data-copy="${t.copy}" data-copied="${t.copied}">${content}</article><div class="article-end"><span class="end-mark" aria-hidden="true">✳</span><p>${source.footer}</p></div></div></div><section class="related"><p class="eyebrow">${lang==='pt-br'?'MAIS NOTAS':'MORE NOTES'}</p><h2>${t.related}</h2><ol class="article-list">${related.map((a,i)=>row(a,lang,i)).join('')}</ol></section></main>`;
  return shell({lang,title,description:article.excerpt[lang],route:articlePath(lang,article.id),alternate,body,article});
}
const profileSnapshots=Object.fromEntries(await Promise.all(['en','pt-br'].map(async lang=>[lang,await fs.readFile(path.join(root,'content/profile',`${lang}.md`),'utf8')])));
const profileProjectSnapshots=Object.fromEntries(await Promise.all(['en','pt-br'].map(async lang=>[lang,await fs.readFile(path.join(root,'content/profile',`projects-${lang}.md`),'utf8')])));
function aboutpage(lang){
  const t=messages[lang];
  const body=`<script type="module" src="${url('/assets/profile-sync.mjs')}"></script><main id="main" class="about-page"><p class="eyebrow">${t.aboutEyebrow}</p><h1>${t.aboutTitle}</h1><div class="about-grid"><figure class="about-portrait"><img src="${url('/assets/bruno-vicco.jpg')}" alt="${lang==='pt-br'?'Retrato de Bruno Vicco':'Portrait of Bruno Vicco'}" width="800" height="800" fetchpriority="high"></figure><div class="prose"><div data-profile-about data-profile-state="snapshot">${renderProfile(profileSnapshots[lang],lang)}</div><section class="profile-projects" aria-labelledby="profile-projects-heading"><h2 id="profile-projects-heading">${profileSources[lang].projectsHeading}</h2><div data-profile-projects data-profile-state="snapshot">${renderProjects(profileProjectSnapshots[lang],lang)}</div></section><div class="about-links"><a class="text-cta" href="${config.github}">GitHub ↗</a><a class="text-cta" href="${config.linkedin}">LinkedIn ↗</a></div><a class="back-link" href="${url('/'+lang+'/')}#library">← ${t.back}</a></div></div></main>`;
  return shell({lang,title:t.about,description:plain(renderProfile(profileSnapshots[lang],lang)).slice(0,240),route:`/${lang}/${lang==='pt-br'?'sobre':'about'}/`,alternate:`/${other(lang)}/${lang==='pt-br'?'about':'sobre'}/`,body});
}
async function write(file,content){const destination=path.join(output,file);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,content);}
await fs.rm(output,{recursive:true,force:true});await fs.mkdir(output,{recursive:true});await fs.cp(path.join(root,'public'),output,{recursive:true});
const sitemap=[];
for(const lang of ['pt-br','en']){
  await write(`${lang}/index.html`,homepage(lang));
  await write(`${lang}/${lang==='pt-br'?'sobre':'about'}/index.html`,aboutpage(lang));
  sitemap.push(`/${lang}/`,`/${lang}/${lang==='pt-br'?'sobre':'about'}/`);
  for(const track of tracks.filter(track=>track.articles.some(a=>a.versions[lang]))){await write(trackPath(lang,track.id).slice(1)+'index.html',trackpage(track,lang));sitemap.push(trackPath(lang,track.id));}
  for(const article of articles.filter(a=>a.versions[lang])){await write(articlePath(lang,article.id).slice(1)+'index.html',articlepage(article,lang));sitemap.push(articlePath(lang,article.id));}
  await write(`${lang}/search-index.json`,JSON.stringify(articles.filter(a=>a.versions[lang]).map(a=>({id:a.id,text:normalize(a.versions[lang].title+' '+a.tags.map(tag=>tagLabel(tag,lang)).join(' ')+' '+plain(a.content[lang]))}))));
  const feed=articles.filter(a=>a.versions[lang]).map(a=>`<item><title>${escape(a.versions[lang].title)}</title><link>${absolute(articlePath(lang,a.id))}</link><guid isPermaLink="true">${absolute(articlePath(lang,a.id))}</guid><pubDate>${new Date(a.date+'T12:00:00Z').toUTCString()}</pubDate><description>${escape(a.excerpt[lang])}</description></item>`).join('');
  await write(`${lang}/feed.xml`,`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Bruno Vicco — ${messages[lang].notes}</title><link>${absolute('/'+lang+'/')}</link><description>${escape(messages[lang].intro)}</description><language>${isoLocale(lang)}</language>${feed}</channel></rss>`);
}
await write('index.html',`<!doctype html><html lang="${isoLocale(defaultLanguage)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bruno Vicco — ${messages[defaultLanguage].notes}</title><link rel="canonical" href="${absolute('/'+defaultLanguage+'/')}"><meta http-equiv="refresh" content="0;url=${url('/'+defaultLanguage+'/')}"></head><body><p><a href="${url('/en/')}" lang="en">English</a> · <a href="${url('/pt-br/')}" lang="pt-BR">Português do Brasil</a></p></body></html>`);
await write('404.html',shell({lang:defaultLanguage,title:'404',description:messages[defaultLanguage].notFoundDesc,route:'/404.html',noindex:true,body:`<main class="not-found" id="main"><p class="eyebrow">404</p><h1>${messages[defaultLanguage].notFound}</h1><p>${messages[defaultLanguage].notFoundDesc}</p><a class="text-cta" href="${url('/'+defaultLanguage+'/')}">${messages[defaultLanguage].browse} →</a><p><a href="${url('/'+other(defaultLanguage)+'/')}">${other(defaultLanguage)==='en'?'Browse articles in English':'Explorar artigos em português'} →</a></p></main>`}));
await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${sitemap.map(route=>`<url><loc>${absolute(route)}</loc></url>`).join('')}</urlset>`);
await write('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${absolute('/sitemap.xml')}\n`);
await write('.nojekyll','');
await write('build-info.json',JSON.stringify({articles:articles.length,versions:articles.reduce((count,a)=>count+Object.keys(a.versions).length,0),localImages:Object.values(assets).filter(a=>a.file).length,originalLanguages:articles.reduce((counts,a)=>(counts[a.originalLanguage]=(counts[a.originalLanguage]||0)+1,counts),{}),siteUrl},null,2));
console.log(`Built ${articles.length} articles, ${articles.reduce((count,a)=>count+Object.keys(a.versions).length,0)} language versions → dist (${siteUrl})`);
